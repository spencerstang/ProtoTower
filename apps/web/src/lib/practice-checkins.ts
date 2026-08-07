import type { Database } from "@protostack/database";
import {
  maximumPracticeHistoryRows,
  parsePracticeCheckIn,
  parsePracticeCheckIns,
  type PracticeCheckIn,
  type PracticeCheckInRepository,
  type PracticeDateRange,
  type PracticeMutationRejection,
  type PracticeMutationResult,
  type SetPracticeCheckInInput,
} from "@protostack/tracking-engine";
import type { TowerId } from "@protostack/tower-engine";
import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "./runtime";
import { createSupabaseServerClient } from "./supabase/server";

type ProviderError = Readonly<{ code?: string }>;

const providerRowKeys = [
  "tower_id",
  "protocol_id",
  "protocol_version",
  "practice_date",
  "created_at",
] as const;

function record(input: unknown): Readonly<Record<string, unknown>> | null {
  return typeof input === "object" && input !== null && !Array.isArray(input)
    ? (input as Readonly<Record<string, unknown>>)
    : null;
}

function providerError(input: unknown): ProviderError {
  const value = record(input);
  return {
    ...(typeof value?.["code"] === "string" ? { code: value["code"] } : {}),
  };
}

function parseProviderRow(input: unknown): PracticeCheckIn {
  const row = record(input);
  if (
    !row ||
    Object.keys(row).length !== providerRowKeys.length ||
    !providerRowKeys.every((key) => Object.hasOwn(row, key))
  ) {
    throw new Error("Practice provider row shape is invalid.");
  }
  return parsePracticeCheckIn({
    towerId: row["tower_id"],
    protocolId: row["protocol_id"],
    protocolVersion: row["protocol_version"],
    practiceDate: row["practice_date"],
    createdAt: row["created_at"],
  });
}

function parseProviderRows(input: unknown): readonly PracticeCheckIn[] {
  if (!Array.isArray(input)) throw new Error("Practice provider response is invalid.");
  return parsePracticeCheckIns(input.map((row) => parseProviderRow(row)));
}

function rejectedReason(error: ProviderError): PracticeMutationRejection | null {
  if (error.code === "P0002") return "not_found";
  if (["22023", "23503", "23505", "23514"].includes(error.code ?? "")) {
    return "invalid_input";
  }
  return null;
}

function mutationFailure(errorInput: unknown): PracticeMutationResult {
  const error = providerError(errorInput);
  const reason = rejectedReason(error);
  if (reason) return { status: "rejected", reason };
  logger.warn("practice_checkin_provider_rejected_request", { code: error.code });
  return { status: "unavailable" };
}

export function createPracticeCheckInRepository(
  client: SupabaseClient<Database> | null,
): PracticeCheckInRepository {
  return {
    async listRecent(
      towerId: TowerId,
      range: PracticeDateRange,
    ): Promise<
      | Readonly<{ status: "available"; value: readonly PracticeCheckIn[] }>
      | Readonly<{ status: "unavailable" }>
    > {
      if (!client) return { status: "unavailable" };
      const { data, error } = await client
        .from("protocol_practice_checkins")
        .select("tower_id,protocol_id,protocol_version,practice_date,created_at")
        .eq("tower_id", towerId)
        .gte("practice_date", range.from)
        .lte("practice_date", range.to)
        .order("practice_date", { ascending: false })
        .order("protocol_id", { ascending: true })
        .order("protocol_version", { ascending: true })
        .limit(maximumPracticeHistoryRows + 1);
      if (error) {
        logger.warn("practice_checkin_list_unavailable", { code: providerError(error).code });
        return { status: "unavailable" };
      }
      try {
        return { status: "available", value: parseProviderRows(data as unknown) };
      } catch {
        logger.error("practice_checkin_provider_shape_invalid");
        return { status: "unavailable" };
      }
    },

    async set(input: SetPracticeCheckInInput): Promise<PracticeMutationResult> {
      if (!client) return { status: "unavailable" };
      const { data, error } = await client.rpc("set_protocol_practice_checkin", {
        candidate_tower_id: input.towerId,
        candidate_protocol_id: input.protocolId,
        candidate_protocol_version: input.protocolVersion,
        candidate_practice_date: input.practiceDate,
        candidate_recorded: input.recorded,
      });
      if (error) return mutationFailure(error);
      if (typeof data !== "boolean" || data !== input.recorded) {
        logger.error("practice_checkin_provider_shape_invalid");
        return { status: "unavailable" };
      }
      return { status: "available", recorded: data };
    },
  };
}

export async function createServerPracticeCheckInRepository(): Promise<PracticeCheckInRepository> {
  return createPracticeCheckInRepository(await createSupabaseServerClient());
}
