import type { Database, Json } from "@protostack/database";
import {
  parsePersonalTower,
  type ConfiguredTowerWrite,
  type DeleteTowerInput,
  type PersonalTower,
  type PersonalTowerRepository,
  type SaveTowerInput,
  type SaveTowerSetupInput,
  type TowerId,
  type TowerMutationRejection,
  type TowerMutationResult,
  type TowerProtocolDraft,
  type TowerQueryResult,
  type TowerSetupDraft,
  type TowerTitle,
} from "@protostack/tower-engine";
import type { MetricDraft } from "@protostack/outcomes-engine";
import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "./runtime";
import { createSupabaseServerClient } from "./supabase/server";

type TowerRow = Database["public"]["Tables"]["personal_towers"]["Row"];
type TowerItemRow = Database["public"]["Tables"]["personal_tower_items"]["Row"];
type TowerProtocolRow = Database["public"]["Tables"]["tower_protocols"]["Row"];
type TowerMetricRow = Database["public"]["Tables"]["tower_metrics"]["Row"];
type ProviderError = Readonly<{ code?: string; message: string }>;

const towerColumns =
  "id,owner_id,title,definition,cadence,audience,identity_mode,custom_dates,revision,created_at,updated_at";

function parseTower(
  row: TowerRow,
  items: readonly TowerItemRow[],
  protocols: readonly TowerProtocolRow[],
  metrics: readonly TowerMetricRow[],
): PersonalTower {
  return parsePersonalTower({
    id: row.id,
    title: row.title,
    definition: row.definition,
    cadence: row.cadence,
    customDates: row.custom_dates,
    audience: row.audience,
    identity: row.identity_mode,
    protocols: protocols
      .filter((protocol) => protocol.tower_id === row.id)
      .sort((left, right) => left.position - right.position)
      .map((protocol) => ({
        id: protocol.id,
        title: protocol.title,
        howTo: protocol.how_to,
        sourceProtocolId: protocol.source_protocol_id,
        sourceProtocolVersion: protocol.source_protocol_version,
        position: protocol.position,
      })),
    metrics: metrics
      .filter((metric) => metric.tower_id === row.id)
      .sort((left, right) => left.position - right.position)
      .map((metric) => ({
        id: metric.id,
        kind: metric.kind,
        shape: metric.shape,
        label: metric.label,
        presetKey: metric.preset_key,
        position: metric.position,
      })),
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

function protocolPayload(protocol: TowerProtocolDraft): Json {
  return {
    ...(protocol.id === undefined ? {} : { id: protocol.id }),
    title: protocol.title,
    how_to: protocol.howTo,
    source_protocol_id: protocol.sourceProtocolId,
    source_protocol_version: protocol.sourceProtocolVersion,
  };
}

function metricPayload(metric: MetricDraft): Json {
  return {
    ...(metric.id === undefined ? {} : { id: metric.id }),
    kind: metric.kind,
    shape: metric.shape,
    label: metric.label,
    preset_key: metric.presetKey,
  };
}

function setupPayload(draft: TowerSetupDraft): Readonly<{
  candidate_definition: string | null;
  candidate_cadence: TowerSetupDraft["cadence"];
  candidate_custom_dates: string[];
  candidate_audience: TowerSetupDraft["audience"];
  candidate_identity: TowerSetupDraft["identity"];
  candidate_protocols: Json;
  candidate_metrics: Json;
}> {
  return {
    candidate_definition: draft.definition,
    candidate_cadence: draft.cadence,
    candidate_custom_dates: [...draft.customDates],
    candidate_audience: draft.audience,
    candidate_identity: draft.identity,
    candidate_protocols: draft.protocols.map(protocolPayload),
    candidate_metrics: draft.metrics.map(metricPayload),
  };
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

async function loadProtocols(
  client: SupabaseClient<Database>,
  towerIds: readonly string[],
): Promise<readonly TowerProtocolRow[] | null> {
  if (towerIds.length === 0) return [];
  const { data, error } = await client
    .from("tower_protocols")
    .select(
      "id,tower_id,position,title,how_to,source_protocol_id,source_protocol_version,created_at",
    )
    .in("tower_id", [...towerIds])
    .order("position", { ascending: true });
  if (error) return null;
  return data;
}

async function loadMetrics(
  client: SupabaseClient<Database>,
  towerIds: readonly string[],
): Promise<readonly TowerMetricRow[] | null> {
  if (towerIds.length === 0) return [];
  const { data, error } = await client
    .from("tower_metrics")
    .select("id,tower_id,position,kind,shape,label,preset_key,created_at")
    .in("tower_id", [...towerIds])
    .order("position", { ascending: true });
  if (error) return null;
  return data;
}

async function loadTower(
  client: SupabaseClient<Database>,
  id: string,
): Promise<TowerQueryResult<PersonalTower | null>> {
  const { data, error } = await client
    .from("personal_towers")
    .select(towerColumns)
    .eq("id", id)
    .maybeSingle();
  if (error) return { status: "unavailable" };
  if (!data) return { status: "available", value: null };
  const [items, protocols, metrics] = await Promise.all([
    loadItems(client, [data.id]),
    loadProtocols(client, [data.id]),
    loadMetrics(client, [data.id]),
  ]);
  if (!items || !protocols || !metrics) return { status: "unavailable" };
  try {
    return { status: "available", value: parseTower(data, items, protocols, metrics) };
  } catch {
    logger.error("personal_tower_provider_shape_invalid");
    return { status: "unavailable" };
  }
}

export function createPersonalTowerRepository(
  client: SupabaseClient<Database> | null,
): PersonalTowerRepository {
  return {
    async list(): Promise<TowerQueryResult<readonly PersonalTower[]>> {
      if (!client) return { status: "unavailable" };
      const { data, error } = await client
        .from("personal_towers")
        .select(towerColumns)
        .order("updated_at", { ascending: false });
      if (error) {
        logger.warn("personal_tower_list_unavailable", { code: error.code });
        return { status: "unavailable" };
      }
      const towerIds = data.map((tower) => tower.id);
      const [items, protocols, metrics] = await Promise.all([
        loadItems(client, towerIds),
        loadProtocols(client, towerIds),
        loadMetrics(client, towerIds),
      ]);
      if (!items || !protocols || !metrics) return { status: "unavailable" };
      try {
        return {
          status: "available",
          value: data.map((tower) => parseTower(tower, items, protocols, metrics)),
        };
      } catch {
        logger.error("personal_tower_provider_shape_invalid");
        return { status: "unavailable" };
      }
    },

    async findById(id: TowerId): Promise<TowerQueryResult<PersonalTower | null>> {
      if (!client) return { status: "unavailable" };
      return loadTower(client, id);
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

    async createConfigured(
      input: ConfiguredTowerWrite,
    ): Promise<TowerMutationResult<PersonalTower>> {
      if (!client) return { status: "unavailable" };
      const { data, error } = await client.rpc("create_configured_personal_tower", {
        candidate_title: input.title,
        ...setupPayload(input.draft),
      });
      if (error) return mutationFailure("create_configured", error);
      const row = data[0];
      if (!row) return { status: "unavailable" };
      const loaded = await loadTower(client, row.id);
      if (loaded.status === "unavailable") return { status: "unavailable" };
      if (!loaded.value) return { status: "unavailable" };
      return { status: "available", value: loaded.value };
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

    async saveSetup(input: SaveTowerSetupInput): Promise<TowerMutationResult<PersonalTower>> {
      if (!client) return { status: "unavailable" };
      const { data, error } = await client.rpc("save_tower_setup", {
        candidate_id: input.id,
        expected_revision: input.expectedRevision,
        candidate_title: input.title,
        ...setupPayload(input.draft),
      });
      if (error) return mutationFailure("save_setup", error);
      const row = data[0];
      if (!row) return { status: "unavailable" };
      const loaded = await loadTower(client, row.id);
      if (loaded.status === "unavailable") return { status: "unavailable" };
      if (!loaded.value) return { status: "rejected", reason: "not_found" };
      return { status: "available", value: loaded.value };
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
