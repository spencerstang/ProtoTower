import type { Database, Json } from "@protostack/database";
import type { TowerId } from "@protostack/tower-engine";
import type { TowerCheckInResponse } from "@protostack/tracking-engine";
import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "./runtime";
import { createSupabaseServerClient } from "./supabase/server";

type ProviderError = Readonly<{ code?: string; message?: string }>;

export type StoredTowerCheckIn = Readonly<{
  id: string;
  periodDate: string;
  responses: readonly {
    metricId: string;
    skipped: boolean;
    numericValue: string | null;
    secondaryNumeric: string | null;
    textValue: string | null;
    completion: "complete" | "incomplete" | null;
  }[];
  markedProtocolIds: readonly string[];
}>;

export type TowerCheckInMutationResult =
  | Readonly<{ status: "available"; id: string }>
  | Readonly<{ status: "rejected"; reason: "invalid_input" | "not_found" | "period_closed" }>
  | Readonly<{ status: "unavailable" }>;

function providerError(error: { code?: string; message?: string }): ProviderError {
  return {
    ...(error.code ? { code: error.code } : {}),
    ...(error.message ? { message: error.message } : {}),
  };
}

function rejectedReason(
  error: ProviderError,
): "invalid_input" | "not_found" | "period_closed" | null {
  if (error.code === "P0002") return "not_found";
  if (error.code === "23514" && error.message === "Check-in period is closed.")
    return "period_closed";
  if (["22023", "23503", "23505", "23514"].includes(error.code ?? "")) return "invalid_input";
  return null;
}

function responsePayload(response: TowerCheckInResponse): Json {
  return {
    metric_id: response.metricId,
    skipped: response.skipped,
    numeric_value: response.numericValue === null ? null : String(response.numericValue),
    secondary_numeric:
      response.secondaryNumeric === null ? null : String(response.secondaryNumeric),
    text_value: response.textValue,
    completion: response.completion,
  };
}

function completion(value: string | null): "complete" | "incomplete" | null {
  if (value === "complete" || value === "incomplete") return value;
  if (value === null) return null;
  throw new Error("Completion is invalid.");
}

export function createTowerCheckInRepository(client: SupabaseClient<Database> | null): {
  findForPeriod(
    towerId: TowerId,
    periodDate: string,
  ): Promise<StoredTowerCheckIn | null | "unavailable">;
  record(input: {
    towerId: TowerId;
    periodDate: string;
    responses: readonly TowerCheckInResponse[];
    markedProtocolIds: readonly string[];
  }): Promise<TowerCheckInMutationResult>;
} {
  return {
    async findForPeriod(towerId, periodDate) {
      if (!client) return "unavailable";
      const checkIn = await client
        .from("tower_checkins")
        .select("id,period_date")
        .eq("tower_id", towerId)
        .eq("period_date", periodDate)
        .maybeSingle();
      if (checkIn.error) {
        logger.warn("tower_checkin_read_unavailable", { code: checkIn.error.code });
        return "unavailable";
      }
      if (!checkIn.data) return null;
      const [responses, marks] = await Promise.all([
        client
          .from("tower_checkin_responses")
          .select("metric_id,skipped,numeric_value,secondary_numeric,text_value,completion")
          .eq("checkin_id", checkIn.data.id),
        client
          .from("tower_checkin_protocol_marks")
          .select("protocol_id,ran")
          .eq("checkin_id", checkIn.data.id),
      ]);
      if (responses.error || marks.error) return "unavailable";
      try {
        return {
          id: checkIn.data.id,
          periodDate: checkIn.data.period_date,
          responses: responses.data.map((response) => ({
            metricId: response.metric_id,
            skipped: response.skipped,
            numericValue: response.numeric_value,
            secondaryNumeric: response.secondary_numeric,
            textValue: response.text_value,
            completion: completion(response.completion),
          })),
          markedProtocolIds: marks.data.flatMap((mark) => (mark.ran ? [mark.protocol_id] : [])),
        };
      } catch {
        logger.error("tower_checkin_provider_shape_invalid");
        return "unavailable";
      }
    },

    async record(input) {
      if (!client) return { status: "unavailable" };
      const { data, error } = await client.rpc("record_tower_checkin", {
        candidate_tower_id: input.towerId,
        candidate_period_date: input.periodDate,
        candidate_responses: input.responses.map(responsePayload),
        candidate_marks: input.markedProtocolIds.map((protocolId) => ({
          protocol_id: protocolId,
          ran: true,
        })),
      });
      if (error) {
        const provider = providerError(error);
        const reason = rejectedReason(provider);
        if (reason) return { status: "rejected", reason };
        logger.warn("tower_checkin_provider_rejected_request", { code: provider.code });
        return { status: "unavailable" };
      }
      if (typeof data !== "string") return { status: "unavailable" };
      return { status: "available", id: data };
    },
  };
}

export async function createServerTowerCheckInRepository(): Promise<
  ReturnType<typeof createTowerCheckInRepository>
> {
  return createTowerCheckInRepository(await createSupabaseServerClient());
}
