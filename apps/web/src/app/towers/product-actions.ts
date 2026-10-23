"use server";

import { isFeatureEnabled } from "@protostack/configuration";
import type { PublishedProtocol } from "@protostack/protocol-engine";
import {
  draftFromStoredSetup,
  interpretCreateForm,
  parseTowerTitle,
  presetMetric,
  addMetricToDraft,
  addProtocolToDraft,
  removeMetricFromDraft,
  removeProtocolFromDraft,
  replaceDefinition,
  replaceProtocolInDraft,
  replaceRhythm,
  replaceVisibility,
  towerIdSchema,
  towerRevisionSchema,
  type PersonalTower,
  type SetupCommitResult,
  type TowerId,
} from "@protostack/tower-engine";
import {
  currentTowerPeriod,
  parseTowerCheckInSubmission,
  utcCalendarDate,
  type TowerCheckInMetric,
} from "@protostack/tracking-engine";
import { redirect } from "next/navigation";
import { getVerifiedPrincipal } from "@/lib/auth";
import { createServerPersonalTowerRepository } from "@/lib/personal-towers";
import { createServerProtocolCatalogRepository } from "@/lib/protocol-catalog";
import { createServerTowerCheckInRepository } from "@/lib/tower-checkins";
import { clipPlainLine, configuredTowerInputFromForm } from "@/lib/tower-setup-form";

function formString(formData: FormData, name: string): string | null {
  const value = formData.get(name);
  return typeof value === "string" ? value : null;
}

function formStrings(formData: FormData, name: string): string[] {
  return formData.getAll(name).flatMap((value) => (typeof value === "string" ? [value] : []));
}

async function requirePrincipal(): Promise<void> {
  const principal = await getVerifiedPrincipal();
  if (principal.status === "unavailable") redirect("/towers?error=unavailable");
  if (principal.principal.kind !== "authenticated") redirect("/sign-in");
}

async function ownedTower(rawId: string | null): Promise<PersonalTower> {
  await requirePrincipal();
  let id: TowerId;
  try {
    id = towerIdSchema.parse(rawId);
  } catch {
    redirect("/towers?error=invalid");
  }
  const result = await (await createServerPersonalTowerRepository()).findById(id);
  if (result.status === "unavailable") redirect(`/towers/${id}?error=unavailable`);
  if (!result.value) redirect("/towers?error=not-found");
  return result.value;
}

function sameRevision(tower: PersonalTower, formData: FormData): void {
  try {
    const revision = towerRevisionSchema.parse(Number(formString(formData, "revision")));
    if (revision !== tower.revision) redirect(`/towers/${tower.id}?error=stale`);
  } catch {
    redirect(`/towers/${tower.id}?error=invalid`);
  }
}

function configuredDraft(tower: PersonalTower): SetupCommitResult {
  if (tower.protocols.length === 0) return { ok: false, code: "protocols" };
  if (!tower.metrics.some((metric) => metric.kind === "final")) return { ok: false, code: "final" };
  try {
    return { ok: true, draft: draftFromStoredSetup(tower) };
  } catch {
    return { ok: false, code: "invalid" };
  }
}

async function persist(tower: PersonalTower, result: SetupCommitResult): Promise<never> {
  if (!result.ok) redirect(`/towers/${tower.id}?error=${result.code}`);
  const saved = await (
    await createServerPersonalTowerRepository()
  ).saveSetup({
    id: tower.id,
    expectedRevision: tower.revision,
    title: tower.title,
    draft: result.draft,
  });
  if (saved.status === "available") redirect(`/towers/${tower.id}?status=saved`);
  if (saved.status === "rejected" && saved.reason === "conflict") {
    redirect(`/towers/${tower.id}?error=stale`);
  }
  if (saved.status === "rejected" && saved.reason === "not_found") {
    redirect("/towers?error=not-found");
  }
  if (saved.status === "rejected") redirect(`/towers/${tower.id}?error=invalid`);
  redirect(`/towers/${tower.id}?error=unavailable`);
}

export async function createConfiguredTower(formData: FormData): Promise<never> {
  await requirePrincipal();
  if (!isFeatureEnabled("outcomes")) redirect("/towers/new?error=unavailable");
  let title;
  try {
    title = parseTowerTitle(formString(formData, "title"));
  } catch {
    redirect("/towers/new?error=invalid");
  }
  const interpreted = interpretCreateForm(configuredTowerInputFromForm(formData));
  if (!interpreted.ok) redirect(`/towers/new?error=${interpreted.code}`);
  const result = await (
    await createServerPersonalTowerRepository()
  ).createConfigured({
    title,
    draft: interpreted.draft,
  });
  if (result.status === "available") redirect(`/towers/${result.value.id}`);
  if (result.status === "rejected" && result.reason === "limit_reached") {
    redirect("/towers/new?error=limit");
  }
  if (result.status === "rejected") redirect("/towers/new?error=invalid");
  redirect("/towers/new?error=unavailable");
}

export async function saveFinishedSetup(formData: FormData): Promise<never> {
  const tower = await ownedTower(formString(formData, "towerId"));
  if (!isFeatureEnabled("outcomes")) redirect(`/towers/${tower.id}?error=unavailable`);
  sameRevision(tower, formData);
  if (tower.protocols.length > 0 || tower.metrics.length > 0) {
    redirect(`/towers/${tower.id}?error=invalid`);
  }
  let title;
  try {
    title = parseTowerTitle(formString(formData, "title"));
  } catch {
    redirect(`/towers/${tower.id}/setup?error=invalid`);
  }
  const interpreted = interpretCreateForm(configuredTowerInputFromForm(formData));
  if (!interpreted.ok) redirect(`/towers/${tower.id}/setup?error=${interpreted.code}`);
  const saved = await (
    await createServerPersonalTowerRepository()
  ).saveSetup({
    id: tower.id,
    expectedRevision: tower.revision,
    title,
    draft: interpreted.draft,
  });
  if (saved.status === "available") redirect(`/towers/${tower.id}?status=saved`);
  if (saved.status === "rejected" && saved.reason === "conflict") {
    redirect(`/towers/${tower.id}/setup?error=stale`);
  }
  redirect(`/towers/${tower.id}/setup?error=unavailable`);
}

export async function saveTowerProtocol(formData: FormData): Promise<never> {
  const tower = await ownedTower(formString(formData, "towerId"));
  sameRevision(tower, formData);
  const current = configuredDraft(tower);
  if (!current.ok) return persist(tower, current);
  const protocolId = formString(formData, "protocolId");
  const existing = tower.protocols.find((protocol) => protocol.id === protocolId);
  if (!existing || !protocolId) redirect(`/towers/${tower.id}?error=invalid`);
  return persist(
    tower,
    replaceProtocolInDraft(current.draft, protocolId, {
      title: formString(formData, "title") ?? "",
      howTo: formString(formData, "howTo") ?? "",
      sourceProtocolId: existing.sourceProtocolId,
      sourceProtocolVersion: existing.sourceProtocolVersion,
    }),
  );
}

export async function addCustomTowerProtocol(formData: FormData): Promise<never> {
  const tower = await ownedTower(formString(formData, "towerId"));
  sameRevision(tower, formData);
  const current = configuredDraft(tower);
  if (!current.ok) return persist(tower, current);
  return persist(
    tower,
    addProtocolToDraft(current.draft, {
      title: formString(formData, "title") ?? "",
      howTo: formString(formData, "howTo") ?? "",
      sourceProtocolId: null,
      sourceProtocolVersion: null,
    }),
  );
}

export async function addStarterTowerProtocol(formData: FormData): Promise<never> {
  const tower = await ownedTower(formString(formData, "towerId"));
  sameRevision(tower, formData);
  const current = configuredDraft(tower);
  if (!current.ok) return persist(tower, current);
  const starter = formString(formData, "starter") ?? "";
  const separator = starter.lastIndexOf("@");
  const catalog = await createServerProtocolCatalogRepository().listPublished();
  if (catalog.status === "unavailable") redirect(`/towers/${tower.id}?error=unavailable`);
  const protocol = catalog.value.find(
    (item) => `${item.id}@${item.version}` === starter && separator > 0,
  );
  if (!protocol) redirect(`/towers/${tower.id}?error=invalid`);
  return persist(tower, addProtocolToDraft(current.draft, starterProtocol(protocol)));
}

export async function removeTowerProtocol(formData: FormData): Promise<never> {
  const tower = await ownedTower(formString(formData, "towerId"));
  sameRevision(tower, formData);
  const current = configuredDraft(tower);
  if (!current.ok) return persist(tower, current);
  return persist(
    tower,
    removeProtocolFromDraft(current.draft, formString(formData, "protocolId") ?? ""),
  );
}

export async function addPresetMetric(formData: FormData): Promise<never> {
  const tower = await ownedTower(formString(formData, "towerId"));
  sameRevision(tower, formData);
  const current = configuredDraft(tower);
  if (!current.ok) return persist(tower, current);
  const metric = presetMetric(formString(formData, "preset") ?? "", "");
  if (!metric) redirect(`/towers/${tower.id}?error=invalid`);
  return persist(tower, addMetricToDraft(current.draft, metric));
}

export async function addCustomMetric(formData: FormData): Promise<never> {
  const tower = await ownedTower(formString(formData, "towerId"));
  sameRevision(tower, formData);
  const current = configuredDraft(tower);
  if (!current.ok) return persist(tower, current);
  const encoded = formString(formData, "customMetricShape") ?? "";
  const separator = encoded.indexOf(":");
  return persist(
    tower,
    addMetricToDraft(current.draft, {
      kind: separator > 0 ? encoded.slice(0, separator) : "",
      shape: separator > 0 ? encoded.slice(separator + 1) : "",
      label: formString(formData, "customMetricLabel") ?? "",
      presetKey: null,
    }),
  );
}

export async function removeTowerMetric(formData: FormData): Promise<never> {
  const tower = await ownedTower(formString(formData, "towerId"));
  sameRevision(tower, formData);
  const current = configuredDraft(tower);
  if (!current.ok) return persist(tower, current);
  return persist(
    tower,
    removeMetricFromDraft(current.draft, formString(formData, "metricId") ?? ""),
  );
}

export async function saveTowerDefinition(formData: FormData): Promise<never> {
  const tower = await ownedTower(formString(formData, "towerId"));
  sameRevision(tower, formData);
  const current = configuredDraft(tower);
  if (!current.ok) return persist(tower, current);
  return persist(tower, replaceDefinition(current.draft, formString(formData, "definition") ?? ""));
}

export async function saveTowerRhythm(formData: FormData): Promise<never> {
  const tower = await ownedTower(formString(formData, "towerId"));
  sameRevision(tower, formData);
  const current = configuredDraft(tower);
  if (!current.ok) return persist(tower, current);
  return persist(
    tower,
    replaceRhythm(
      current.draft,
      formString(formData, "cadence"),
      formStrings(formData, "customDate").filter((date) => date !== ""),
    ),
  );
}

export async function saveTowerVisibility(formData: FormData): Promise<never> {
  const tower = await ownedTower(formString(formData, "towerId"));
  sameRevision(tower, formData);
  const current = configuredDraft(tower);
  if (!current.ok) return persist(tower, current);
  return persist(
    tower,
    replaceVisibility(
      current.draft,
      formString(formData, "audience"),
      formString(formData, "identity") ?? "named",
    ),
  );
}

export async function recordTowerCheckIn(formData: FormData): Promise<never> {
  const tower = await ownedTower(formString(formData, "towerId"));
  if (!isFeatureEnabled("outcomes") || !isFeatureEnabled("protocolTracking")) {
    redirect(`/towers/${tower.id}?error=checkin-unavailable`);
  }
  const today = utcCalendarDate(new Date());
  const period = currentTowerPeriod({
    cadence: tower.cadence,
    customDates: tower.customDates,
    anchorDate: utcCalendarDate(new Date(tower.createdAt)),
    today,
  });
  if (!period) redirect(`/towers/${tower.id}?error=checkin-closed`);
  const metrics: TowerCheckInMetric[] = tower.metrics.map((metric) => ({
    id: metric.id,
    kind: metric.kind,
    shape: metric.shape,
    label: metric.label,
  }));
  let parsed: ReturnType<typeof parseTowerCheckInSubmission>;
  try {
    parsed = parseTowerCheckInSubmission(
      metrics,
      metrics.map((metric) => metricSubmission(metric, formData)),
      formStrings(formData, "ran"),
      tower.protocols.map((protocol) => protocol.id),
    );
  } catch {
    redirect(`/towers/${tower.id}?error=checkin-invalid`);
  }
  const result = await (
    await createServerTowerCheckInRepository()
  ).record({
    towerId: tower.id,
    periodDate: period,
    responses: parsed.responses,
    markedProtocolIds: parsed.markedProtocolIds,
  });
  if (result.status === "available") redirect(`/towers/${tower.id}?status=checked-in`);
  if (result.status === "rejected" && result.reason === "period_closed") {
    redirect(`/towers/${tower.id}?error=checkin-closed`);
  }
  if (result.status === "rejected" && result.reason === "not_found") {
    redirect("/towers?error=not-found");
  }
  if (result.status === "rejected") redirect(`/towers/${tower.id}?error=checkin-invalid`);
  redirect(`/towers/${tower.id}?error=checkin-unavailable`);
}

function starterProtocol(protocol: PublishedProtocol): {
  title: string;
  howTo: string;
  sourceProtocolId: string;
  sourceProtocolVersion: number;
} {
  return {
    title: protocol.title,
    howTo: clipPlainLine(protocol.summary),
    sourceProtocolId: protocol.id,
    sourceProtocolVersion: protocol.version,
  };
}

function metricSubmission(
  metric: TowerCheckInMetric,
  formData: FormData,
): {
  metricId: string;
  skipped: boolean;
  numeric: string | null;
  secondary: string | null;
  text: string | null;
  completion: string | null;
} {
  const present = (name: string): string | null => {
    const value = formString(formData, name);
    if (value === null || value.trim() === "") return null;
    return value;
  };
  const numeric = present(`numeric.${metric.id}`);
  const secondary = present(`secondary.${metric.id}`);
  const text = present(`text.${metric.id}`);
  const completion = present(`completion.${metric.id}`);
  const hasValue = numeric !== null || secondary !== null || text !== null || completion !== null;
  const skipped =
    metric.kind !== "final" && (formString(formData, `skip.${metric.id}`) === "yes" || !hasValue);
  return {
    metricId: metric.id,
    skipped,
    numeric: skipped ? null : numeric,
    secondary: skipped ? null : secondary,
    text: skipped ? null : text,
    completion: skipped ? null : completion,
  };
}
