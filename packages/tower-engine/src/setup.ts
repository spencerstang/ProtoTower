import {
  maximumMetricsPerTower,
  metricDraftSchema,
  metricPresetByKey,
  parseOptionalPlainLine,
  storedMetricSchema,
  type MetricDraft,
  type StoredMetric,
} from "@protostack/outcomes-engine";
import { protocolIdSchema, type ProtocolId } from "@protostack/protocol-engine";
import { z } from "zod";
import { assertPlainLine } from "./plain-line";

export const maximumTowerProtocols = 20;
export const firstTowerProtocolLimit = 3;

export const towerCadenceSchema = z.enum([
  "daily",
  "weekly",
  "biweekly",
  "monthly",
  "quarterly",
  "annually",
  "custom",
]);
export type TowerCadence = z.infer<typeof towerCadenceSchema>;

export const towerAudienceSchema = z.enum(["private", "shared"]);
export type TowerAudience = z.infer<typeof towerAudienceSchema>;

export const towerIdentitySchema = z.enum(["named", "anonymous"]);
export type TowerIdentity = z.infer<typeof towerIdentitySchema>;

const calendarDatePattern = /^\d{4}-\d{2}-\d{2}$/u;

function isCalendarDate(value: string): boolean {
  if (!calendarDatePattern.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export const calendarDateSchema = z
  .string()
  .regex(calendarDatePattern, "Use a YYYY-MM-DD date.")
  .refine(isCalendarDate, "Use a real calendar date.");
export type CalendarDate = z.infer<typeof calendarDateSchema>;

export const towerDefinitionSchema = z
  .union([z.string(), z.null()])
  .transform((value) => parseOptionalPlainLine(value, 160));

const protocolTitleSchema = z.string().transform((value) => assertPlainLine(value, 80));
const protocolHowToSchema = z.string().transform((value) => assertPlainLine(value, 280));

export const towerProtocolDraftSchema = z
  .object({
    id: z.uuid().optional(),
    title: protocolTitleSchema,
    howTo: protocolHowToSchema,
    sourceProtocolId: z.union([protocolIdSchema, z.null()]),
    sourceProtocolVersion: z.union([z.int().positive(), z.null()]),
  })
  .strict()
  .superRefine((protocol, context) => {
    const hasSource = protocol.sourceProtocolId !== null;
    const hasVersion = protocol.sourceProtocolVersion !== null;
    if (hasSource !== hasVersion) {
      context.addIssue({
        code: "custom",
        path: ["sourceProtocolId"],
        message: "Protocol source must include both an id and a version.",
      });
    }
  });
export type TowerProtocolDraft = Readonly<z.infer<typeof towerProtocolDraftSchema>>;

export const storedTowerProtocolSchema = towerProtocolDraftSchema
  .safeExtend({
    id: z.uuid().brand<"TowerProtocolId">(),
    position: z.int().min(1).max(maximumTowerProtocols),
  })
  .strict();
export type StoredTowerProtocol = Readonly<z.infer<typeof storedTowerProtocolSchema>>;
export type TowerProtocolId = StoredTowerProtocol["id"];

export const cadencePeriodLabels: Record<TowerCadence, string> = {
  daily: "Today",
  weekly: "This week",
  biweekly: "This two-week period",
  monthly: "This month",
  quarterly: "This quarter",
  annually: "This year",
  custom: "This date",
};

export const cadenceChoiceLabels: Record<TowerCadence, string> = {
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Bi-weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  annually: "Annually",
  custom: "Specific dates",
};

export function visibilityLabel(audience: TowerAudience, identity: TowerIdentity): string {
  if (audience === "private") return "Private";
  return identity === "anonymous" ? "Shared · Anonymous" : "Shared · Named";
}

export function identityChoiceVisible(audience: TowerAudience): boolean {
  return audience === "shared";
}

const setupFieldsSchema = z
  .object({
    definition: towerDefinitionSchema,
    cadence: towerCadenceSchema,
    customDates: z.array(calendarDateSchema).max(24),
    audience: towerAudienceSchema,
    identity: towerIdentitySchema,
    protocols: z.array(towerProtocolDraftSchema).max(maximumTowerProtocols),
    metrics: z.array(metricDraftSchema).max(maximumMetricsPerTower),
  })
  .strict();

export type TowerSetupDraft = Readonly<{
  definition: string | null;
  cadence: TowerCadence;
  customDates: readonly CalendarDate[];
  audience: TowerAudience;
  identity: TowerIdentity;
  protocols: readonly TowerProtocolDraft[];
  metrics: readonly MetricDraft[];
}>;

export type SetupIssueCode = "protocols" | "final" | "dates" | "invalid";

export type SetupCommitResult =
  Readonly<{ ok: true; draft: TowerSetupDraft }> | Readonly<{ ok: false; code: SetupIssueCode }>;

function duplicateText(values: readonly string[]): boolean {
  const seen = new Set<string>();
  for (const value of values) {
    const key = value.toLocaleLowerCase("en-US");
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
}

function reviewParsedSetup(
  draft: z.infer<typeof setupFieldsSchema>,
  maximumProtocols: number,
): SetupCommitResult {
  if (draft.protocols.length < 1 || draft.protocols.length > maximumProtocols) {
    return { ok: false, code: "protocols" };
  }
  if (!draft.metrics.some((metric) => metric.kind === "final")) {
    return { ok: false, code: "final" };
  }
  if (draft.cadence === "custom" && draft.customDates.length < 1) {
    return { ok: false, code: "dates" };
  }
  if (draft.cadence !== "custom" && draft.customDates.length > 0) {
    return { ok: false, code: "dates" };
  }
  if (new Set(draft.customDates).size !== draft.customDates.length) {
    return { ok: false, code: "dates" };
  }
  if (duplicateText(draft.protocols.map((protocol) => protocol.title))) {
    return { ok: false, code: "invalid" };
  }
  const sources = draft.protocols.flatMap((protocol) =>
    protocol.sourceProtocolId ? [protocol.sourceProtocolId] : [],
  );
  if (new Set(sources).size !== sources.length) return { ok: false, code: "invalid" };
  const protocolIds = draft.protocols.flatMap((protocol) => (protocol.id ? [protocol.id] : []));
  if (new Set(protocolIds).size !== protocolIds.length) return { ok: false, code: "invalid" };
  if (duplicateText(draft.metrics.map((metric) => metric.label))) {
    return { ok: false, code: "invalid" };
  }
  const presetKeys = draft.metrics.flatMap((metric) =>
    metric.presetKey ? [metric.presetKey] : [],
  );
  if (new Set(presetKeys).size !== presetKeys.length) return { ok: false, code: "invalid" };
  const metricIds = draft.metrics.flatMap((metric) => (metric.id ? [metric.id] : []));
  if (new Set(metricIds).size !== metricIds.length) return { ok: false, code: "invalid" };

  const customDates = [...draft.customDates].sort();
  return {
    ok: true,
    draft: {
      definition: draft.definition,
      cadence: draft.cadence,
      customDates,
      audience: draft.audience,
      identity: draft.audience === "private" ? "named" : draft.identity,
      protocols: draft.protocols,
      metrics: draft.metrics,
    },
  };
}

export function commitTowerSetup(input: unknown, maximumProtocols: number): SetupCommitResult {
  const parsed = setupFieldsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };
  return reviewParsedSetup(parsed.data, maximumProtocols);
}

export type CreateFormProtocol = Readonly<{
  title: string;
  howTo: string;
  sourceProtocolId: string | null;
  sourceProtocolVersion: number | null;
}>;

export type CreateFormMetric = Readonly<{
  kind: string;
  shape: string;
  label: string;
  presetKey: string | null;
}>;

export function interpretCreateForm(input: unknown): SetupCommitResult {
  if (typeof input !== "object" || input === null) return { ok: false, code: "invalid" };
  const record = input as Record<string, unknown>;
  const protocols = Array.isArray(record["protocols"]) ? record["protocols"] : null;
  const metrics = Array.isArray(record["metrics"]) ? record["metrics"] : null;
  const customDates = Array.isArray(record["customDates"]) ? record["customDates"] : null;
  if (!protocols || !metrics || !customDates) return { ok: false, code: "invalid" };
  return commitTowerSetup(
    {
      definition: record["definition"] ?? null,
      cadence: record["cadence"],
      customDates: customDates.filter((date) => date !== ""),
      audience: record["audience"],
      identity: record["identity"],
      protocols,
      metrics,
    },
    firstTowerProtocolLimit,
  );
}

export function draftFromStoredSetup(input: {
  definition: string | null;
  cadence: TowerCadence;
  customDates: readonly string[];
  audience: TowerAudience;
  identity: TowerIdentity;
  protocols: readonly StoredTowerProtocol[];
  metrics: readonly StoredMetric[];
}): TowerSetupDraft {
  const committed = commitTowerSetup(
    {
      definition: input.definition,
      cadence: input.cadence,
      customDates: [...input.customDates],
      audience: input.audience,
      identity: input.identity,
      protocols: input.protocols.map((protocol) => ({
        id: protocol.id,
        title: protocol.title,
        howTo: protocol.howTo,
        sourceProtocolId: protocol.sourceProtocolId,
        sourceProtocolVersion: protocol.sourceProtocolVersion,
      })),
      metrics: input.metrics.map((metric) => ({
        id: metric.id,
        kind: metric.kind,
        shape: metric.shape,
        label: metric.label,
        presetKey: metric.presetKey,
      })),
    },
    maximumTowerProtocols,
  );
  if (!committed.ok) throw new Error("Stored tower setup is invalid.");
  return committed.draft;
}

export function addProtocolToDraft(
  draft: TowerSetupDraft,
  protocol: CreateFormProtocol,
): SetupCommitResult {
  return commitTowerSetup(
    { ...draft, protocols: [...draft.protocols, protocol] },
    maximumTowerProtocols,
  );
}

export function replaceProtocolInDraft(
  draft: TowerSetupDraft,
  protocolId: string,
  protocol: CreateFormProtocol,
): SetupCommitResult {
  if (!draft.protocols.some((item) => item.id === protocolId)) {
    return { ok: false, code: "invalid" };
  }
  return commitTowerSetup(
    {
      ...draft,
      protocols: draft.protocols.map((item) =>
        item.id === protocolId ? { ...protocol, id: protocolId } : item,
      ),
    },
    maximumTowerProtocols,
  );
}

export function removeProtocolFromDraft(
  draft: TowerSetupDraft,
  protocolId: string,
): SetupCommitResult {
  if (!draft.protocols.some((item) => item.id === protocolId)) {
    return { ok: false, code: "invalid" };
  }
  return commitTowerSetup(
    { ...draft, protocols: draft.protocols.filter((item) => item.id !== protocolId) },
    maximumTowerProtocols,
  );
}

export function addMetricToDraft(
  draft: TowerSetupDraft,
  metric: CreateFormMetric,
): SetupCommitResult {
  return commitTowerSetup({ ...draft, metrics: [...draft.metrics, metric] }, maximumTowerProtocols);
}

export function removeMetricFromDraft(draft: TowerSetupDraft, metricId: string): SetupCommitResult {
  if (!draft.metrics.some((metric) => metric.id === metricId)) {
    return { ok: false, code: "invalid" };
  }
  return commitTowerSetup(
    { ...draft, metrics: draft.metrics.filter((metric) => metric.id !== metricId) },
    maximumTowerProtocols,
  );
}

export function replaceDefinition(draft: TowerSetupDraft, definition: unknown): SetupCommitResult {
  return commitTowerSetup({ ...draft, definition }, maximumTowerProtocols);
}

export function replaceRhythm(
  draft: TowerSetupDraft,
  cadence: unknown,
  customDates: readonly string[],
): SetupCommitResult {
  return commitTowerSetup({ ...draft, cadence, customDates }, maximumTowerProtocols);
}

export function replaceVisibility(
  draft: TowerSetupDraft,
  audience: unknown,
  identity: unknown,
): SetupCommitResult {
  return commitTowerSetup({ ...draft, audience, identity }, maximumTowerProtocols);
}

export function presetMetric(key: string, label: string): CreateFormMetric | null {
  const preset = metricPresetByKey(key);
  if (!preset) return null;
  return {
    kind: preset.kind,
    shape: preset.shape,
    label: label.trim() === "" ? preset.label : label,
    presetKey: preset.key,
  };
}

export function assertStoredSetup(input: {
  definition: string | null;
  cadence: TowerCadence;
  customDates: readonly string[];
  audience: TowerAudience;
  identity: TowerIdentity;
  protocols: readonly StoredTowerProtocol[];
  metrics: readonly StoredMetric[];
}): void {
  const protocolIds = new Set<string>();
  const sources = new Set<ProtocolId>();
  input.protocols.forEach((protocol, index) => {
    if (protocol.position !== index + 1) throw new Error("Protocol positions are invalid.");
    if (protocolIds.has(protocol.id)) throw new Error("Protocol ids are duplicated.");
    protocolIds.add(protocol.id);
    if (protocol.sourceProtocolId) {
      if (sources.has(protocol.sourceProtocolId)) throw new Error("Protocol source is duplicated.");
      sources.add(protocol.sourceProtocolId);
    }
  });
  const metricIds = new Set<string>();
  input.metrics.forEach((metric, index) => {
    if (metric.position !== index + 1) throw new Error("Metric positions are invalid.");
    if (metricIds.has(metric.id)) throw new Error("Metric ids are duplicated.");
    metricIds.add(metric.id);
  });
  if (input.audience === "private" && input.identity !== "named") {
    throw new Error("Private towers are named.");
  }
  if (input.cadence === "custom" && input.customDates.length < 1) {
    throw new Error("Specific dates are required.");
  }
  if (input.cadence !== "custom" && input.customDates.length > 0) {
    throw new Error("Dates belong only on a specific-date rhythm.");
  }
  if (new Set(input.customDates).size !== input.customDates.length) {
    throw new Error("Dates are duplicated.");
  }
  const configured = input.protocols.length > 0 || input.metrics.length > 0;
  if (!configured) return;
  const committed = commitTowerSetup(
    {
      definition: input.definition,
      cadence: input.cadence,
      customDates: [...input.customDates],
      audience: input.audience,
      identity: input.identity,
      protocols: input.protocols.map((protocol) => ({
        id: protocol.id,
        title: protocol.title,
        howTo: protocol.howTo,
        sourceProtocolId: protocol.sourceProtocolId,
        sourceProtocolVersion: protocol.sourceProtocolVersion,
      })),
      metrics: input.metrics.map((metric) => ({
        id: metric.id,
        kind: metric.kind,
        shape: metric.shape,
        label: metric.label,
        presetKey: metric.presetKey,
      })),
    },
    maximumTowerProtocols,
  );
  if (!committed.ok) throw new Error("Tower setup is invalid.");
}

export { storedMetricSchema };
