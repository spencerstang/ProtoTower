import type { Database, Json } from "@protostack/database";
import {
  parsePersonalTower,
  type DeleteTowerInput,
  type PersonalTower,
  type PersonalTowerRepository,
  type SaveTowerInput,
  type TowerId,
  type TowerMutationRejection,
  type TowerMutationResult,
  type TowerQueryResult,
  type TowerTitle,
} from "@protostack/tower-engine";
import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "./runtime";
import { createSupabaseServerClient } from "./supabase/server";

type TowerRow = Database["public"]["Tables"]["personal_towers"]["Row"];
type TowerItemRow = Database["public"]["Tables"]["personal_tower_items"]["Row"];
type ProviderError = Readonly<{ code?: string; message: string }>;

function parseTower(row: TowerRow, items: readonly TowerItemRow[]): PersonalTower {
  return parsePersonalTower({
    id: row.id,
    title: row.title,
    revision: row.revision,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items: items
      .filter((item) => item.tower_id === row.id)
      .sort((left, right) => left.position - right.position)
      .map((item) => ({
        protocolId: item.protocol_id,
        protocolVersion: item.protocol_version,
        position: item.position,
      })),
  });
}

function rejectedReason(error: ProviderError): TowerMutationRejection | null {
  if (error.code === "40001") return "conflict";
  if (error.code === "P0002") return "not_found";
  if (error.code === "23514" && error.message === "Tower limit reached.") return "limit_reached";
  if (["22023", "23503", "23505", "23514"].includes(error.code ?? "")) {
    return "invalid_input";
  }
  return null;
}

function mutationFailure<T>(operation: string, error: ProviderError): TowerMutationResult<T> {
  const reason = rejectedReason(error);
  if (reason) return { status: "rejected", reason };
  logger.warn("personal_tower_provider_rejected_request", { operation, code: error.code });
  return { status: "unavailable" };
}

async function loadItems(
  client: SupabaseClient<Database>,
  towerIds: readonly string[],
): Promise<readonly TowerItemRow[] | null> {
  if (towerIds.length === 0) return [];
  const { data, error } = await client
    .from("personal_tower_items")
    .select("tower_id,protocol_id,protocol_version,position,created_at")
    .in("tower_id", [...towerIds])
    .order("position", { ascending: true });
  if (error) return null;
  return data;
}

export function createPersonalTowerRepository(
  client: SupabaseClient<Database> | null,
): PersonalTowerRepository {
  return {
    async list(): Promise<TowerQueryResult<readonly PersonalTower[]>> {
      if (!client) return { status: "unavailable" };
      const { data, error } = await client
        .from("personal_towers")
        .select("id,owner_id,title,revision,created_at,updated_at")
        .order("updated_at", { ascending: false });
      if (error) {
        logger.warn("personal_tower_list_unavailable", { code: error.code });
        return { status: "unavailable" };
      }
      const items = await loadItems(
        client,
        data.map((tower) => tower.id),
      );
      if (!items) return { status: "unavailable" };
      try {
        return { status: "available", value: data.map((tower) => parseTower(tower, items)) };
      } catch {
        logger.error("personal_tower_provider_shape_invalid");
        return { status: "unavailable" };
      }
    },

    async findById(id: TowerId): Promise<TowerQueryResult<PersonalTower | null>> {
      if (!client) return { status: "unavailable" };
      const { data, error } = await client
        .from("personal_towers")
        .select("id,owner_id,title,revision,created_at,updated_at")
        .eq("id", id)
        .maybeSingle();
      if (error) return { status: "unavailable" };
      if (!data) return { status: "available", value: null };
      const items = await loadItems(client, [data.id]);
      if (!items) return { status: "unavailable" };
      try {
        return { status: "available", value: parseTower(data, items) };
      } catch {
        logger.error("personal_tower_provider_shape_invalid");
        return { status: "unavailable" };
      }
    },

    async create(title: TowerTitle): Promise<TowerMutationResult<PersonalTower>> {
      if (!client) return { status: "unavailable" };
      const { data, error } = await client.rpc("create_personal_tower", {
        candidate_title: title,
      });
      if (error) return mutationFailure("create", error);
      const row = data[0];
      if (!row) return { status: "unavailable" };
      try {
        return {
          status: "available",
          value: parsePersonalTower({
            id: row.id,
            title: row.title,
            revision: row.revision,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            items: [],
          }),
        };
      } catch {
        return { status: "unavailable" };
      }
    },

    async save(input: SaveTowerInput): Promise<TowerMutationResult<PersonalTower>> {
      if (!client) return { status: "unavailable" };
      const payload: Json = input.items.map((item) => ({
        protocol_id: item.protocolId,
        protocol_version: item.protocolVersion,
        position: item.position,
      }));
      const { data, error } = await client.rpc("save_personal_tower", {
        candidate_id: input.id,
        candidate_title: input.title,
        candidate_items: payload,
        expected_revision: input.expectedRevision,
      });
      if (error) return mutationFailure("save", error);
      const row = data[0];
      if (!row) return { status: "unavailable" };
      try {
        return {
          status: "available",
          value: parsePersonalTower({
            id: row.id,
            title: row.title,
            revision: row.revision,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            items: input.items,
          }),
        };
      } catch {
        return { status: "unavailable" };
      }
    },

    async delete(input: DeleteTowerInput): Promise<TowerMutationResult<boolean>> {
      if (!client) return { status: "unavailable" };
      const { data, error } = await client.rpc("delete_personal_tower", {
        candidate_id: input.id,
        expected_revision: input.expectedRevision,
      });
      if (error) return mutationFailure("delete", error);
      return data
        ? { status: "available", value: true }
        : { status: "rejected", reason: "not_found" };
    },
  };
}

export async function createServerPersonalTowerRepository(): Promise<PersonalTowerRepository> {
  return createPersonalTowerRepository(await createSupabaseServerClient());
}
