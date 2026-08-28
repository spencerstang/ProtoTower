import type { Database } from "@protostack/database";
import { parsePseudonym, type Pseudonym } from "@protostack/authorization";
import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "./runtime";
import { createSupabaseServerClient } from "./supabase/server";

type ProfileRow = Database["public"]["Tables"]["account_profiles"]["Row"];

export type AccountProfile = Readonly<{
  pseudonym: Pseudonym;
  revision: number;
  createdAt: string;
  updatedAt: string;
}>;

export type AccountProfileQueryResult =
  | Readonly<{ status: "available"; value: AccountProfile | null }>
  | Readonly<{ status: "unavailable" }>;

export type AccountProfileMutationResult =
  | Readonly<{ status: "available"; value: AccountProfile }>
  | Readonly<{ status: "rejected"; reason: "conflict" | "invalid_input" }>
  | Readonly<{ status: "unavailable" }>;

function parseProfile(row: Omit<ProfileRow, "owner_id">): AccountProfile {
  if (!Number.isSafeInteger(row.revision) || row.revision < 0) throw new Error("Invalid revision");
  return {
    pseudonym: parsePseudonym(row.pseudonym),
    revision: row.revision,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createAccountProfileRepository(client: SupabaseClient<Database> | null) {
  return {
    async get(): Promise<AccountProfileQueryResult> {
      if (!client) return { status: "unavailable" };
      const { data, error } = await client
        .from("account_profiles")
        .select("pseudonym,revision,created_at,updated_at")
        .maybeSingle();
      if (error) {
        logger.warn("account_profile_read_unavailable", { code: error.code });
        return { status: "unavailable" };
      }
      if (!data) return { status: "available", value: null };
      try {
        return { status: "available", value: parseProfile(data) };
      } catch {
        logger.error("account_profile_provider_shape_invalid");
        return { status: "unavailable" };
      }
    },

    async save(
      pseudonym: Pseudonym,
      expectedRevision: number | null,
    ): Promise<AccountProfileMutationResult> {
      if (!client) return { status: "unavailable" };
      const { data, error } = await client.rpc("save_account_pseudonym", {
        candidate_pseudonym: pseudonym,
        ...(expectedRevision === null ? {} : { expected_revision: expectedRevision }),
      });
      if (error) {
        if (error.code === "40001") return { status: "rejected", reason: "conflict" };
        if (error.code === "23514") return { status: "rejected", reason: "invalid_input" };
        logger.warn("account_profile_save_unavailable", { code: error.code });
        return { status: "unavailable" };
      }
      const row = data[0];
      if (!row) return { status: "unavailable" };
      try {
        return { status: "available", value: parseProfile(row) };
      } catch {
        logger.error("account_profile_provider_shape_invalid");
        return { status: "unavailable" };
      }
    },
  };
}

export async function createServerAccountProfileRepository() {
  return createAccountProfileRepository(await createSupabaseServerClient());
}
