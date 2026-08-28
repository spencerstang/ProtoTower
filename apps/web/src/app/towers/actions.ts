"use server";

import {
  addTowerItem,
  moveTowerItem,
  parseTowerTitle,
  removeTowerItem,
  towerIdSchema,
  towerRevisionSchema,
  type PersonalTower,
  type PersonalTowerRepository,
  type TowerId,
  type TowerRevision,
} from "@protostack/tower-engine";
import { protocolIdSchema } from "@protostack/protocol-engine";
import { isFeatureEnabled } from "@protostack/configuration";
import {
  assertPracticeDateWithinWindow,
  parseSetPracticeCheckInInput,
  type SetPracticeCheckInInput,
} from "@protostack/tracking-engine";
import { redirect } from "next/navigation";
import { getVerifiedPrincipal } from "@/lib/auth";
import { createServerPersonalTowerRepository } from "@/lib/personal-towers";
import { createServerPracticeCheckInRepository } from "@/lib/practice-checkins";
import { createServerProtocolCatalogRepository } from "@/lib/protocol-catalog";

function formString(formData: FormData, name: string): string | null {
  const value = formData.get(name);
  return typeof value === "string" ? value : null;
}

async function requirePrincipal(): Promise<void> {
  const principal = await getVerifiedPrincipal();
  if (principal.status === "unavailable") redirect("/towers?error=unavailable");
  if (principal.principal.kind !== "authenticated") redirect("/sign-in");
}

function parseIdentity(formData: FormData): Readonly<{ id: TowerId; revision: TowerRevision }> {
  return {
    id: towerIdSchema.parse(formString(formData, "towerId")),
    revision: towerRevisionSchema.parse(Number(formString(formData, "revision"))),
  };
}

async function loadOwnedTower(
  repository: PersonalTowerRepository,
  id: TowerId,
  revision: TowerRevision,
): Promise<PersonalTower> {
  const result = await repository.findById(id);
  if (result.status === "unavailable") redirect(`/towers/${id}?error=unavailable`);
  if (!result.value) redirect("/towers?error=not-found");
  if (result.value.revision !== revision) redirect(`/towers/${id}?error=stale`);
  return result.value;
}

function redirectAfterMutation(
  id: TowerId,
  result: Awaited<ReturnType<PersonalTowerRepository["save"]>>,
): never {
  if (result.status === "available") redirect(`/towers/${id}?status=saved`);
  if (result.status === "rejected" && result.reason === "conflict") {
    redirect(`/towers/${id}?error=stale`);
  }
  if (result.status === "rejected" && result.reason === "not_found") {
    redirect("/towers?error=not-found");
  }
  if (result.status === "rejected") redirect(`/towers/${id}?error=invalid`);
  redirect(`/towers/${id}?error=unavailable`);
}

export async function createTower(formData: FormData): Promise<never> {
  await requirePrincipal();
  let title;
  try {
    title = parseTowerTitle(formString(formData, "title"));
  } catch {
    redirect("/towers/new?error=invalid");
  }
  const result = await (await createServerPersonalTowerRepository()).create(title);
  if (result.status === "available") redirect(`/towers/${result.value.id}`);
  if (result.status === "rejected" && result.reason === "limit_reached") {
    redirect("/towers/new?error=limit");
  }
  if (result.status === "rejected") redirect("/towers/new?error=invalid");
  redirect("/towers/new?error=unavailable");
}

export async function renameTower(formData: FormData): Promise<never> {
  await requirePrincipal();
  let identity;
  let title;
  try {
    identity = parseIdentity(formData);
    title = parseTowerTitle(formString(formData, "title"));
  } catch {
    redirect("/towers?error=invalid");
  }
  const repository = await createServerPersonalTowerRepository();
  const tower = await loadOwnedTower(repository, identity.id, identity.revision);
  const result = await repository.save({
    id: identity.id,
    title,
    items: tower.items,
    expectedRevision: identity.revision,
  });
  return redirectAfterMutation(identity.id, result);
}

async function changeTowerItem(
  formData: FormData,
  operation: "add" | "move-up" | "move-down" | "remove",
): Promise<never> {
  await requirePrincipal();
  let identity;
  let protocolId;
  try {
    identity = parseIdentity(formData);
    protocolId = protocolIdSchema.parse(formString(formData, "protocolId"));
  } catch {
    redirect("/towers?error=invalid");
  }
  const repository = await createServerPersonalTowerRepository();
  const tower = await loadOwnedTower(repository, identity.id, identity.revision);
  let items;
  try {
    if (operation === "add") {
      const catalog = await createServerProtocolCatalogRepository().listPublished();
      if (catalog.status === "unavailable") redirect(`/towers/${identity.id}?error=unavailable`);
      const currentProtocol = catalog.value.find((protocol) => protocol.id === protocolId);
      if (!currentProtocol) redirect(`/towers/${identity.id}?error=invalid`);
      items = addTowerItem(tower.items, protocolId, currentProtocol.version);
    } else if (operation === "remove") {
      items = removeTowerItem(tower.items, protocolId);
    } else {
      items = moveTowerItem(tower.items, protocolId, operation === "move-up" ? "up" : "down");
    }
  } catch {
    redirect(`/towers/${identity.id}?error=invalid`);
  }
  const result = await repository.save({
    id: identity.id,
    title: tower.title,
    items,
    expectedRevision: identity.revision,
  });
  return redirectAfterMutation(identity.id, result);
}

export async function addTowerItemAction(formData: FormData): Promise<never> {
  return changeTowerItem(formData, "add");
}

export async function addProtocolToSelectedTower(formData: FormData): Promise<never> {
  const destination = formString(formData, "destination");
  const protocolId = formString(formData, "protocolId");
  const separator = destination?.lastIndexOf(":") ?? -1;
  if (!destination || separator < 1 || !protocolId) redirect("/protocols?error=invalid");
  const towerForm = new FormData();
  towerForm.set("towerId", destination.slice(0, separator));
  towerForm.set("revision", destination.slice(separator + 1));
  towerForm.set("protocolId", protocolId);
  return changeTowerItem(towerForm, "add");
}

export async function moveTowerItemUp(formData: FormData): Promise<never> {
  return changeTowerItem(formData, "move-up");
}

export async function moveTowerItemDown(formData: FormData): Promise<never> {
  return changeTowerItem(formData, "move-down");
}

export async function removeTowerItemAction(formData: FormData): Promise<never> {
  return changeTowerItem(formData, "remove");
}

export async function setPracticeCheckIn(formData: FormData): Promise<never> {
  await requirePrincipal();
  const rawTowerId = formString(formData, "towerId");
  let input: SetPracticeCheckInInput;
  try {
    const recorded = formString(formData, "recorded");
    input = parseSetPracticeCheckInInput({
      towerId: rawTowerId,
      protocolId: formString(formData, "protocolId"),
      protocolVersion: Number(formString(formData, "protocolVersion")),
      practiceDate: formString(formData, "practiceDate"),
      recorded: recorded === "true" ? true : recorded === "false" ? false : null,
    });
    assertPracticeDateWithinWindow(input.practiceDate, new Date());
  } catch {
    const towerId = towerIdSchema.safeParse(rawTowerId);
    if (towerId.success) redirect(`/towers/${towerId.data}?error=practice-invalid`);
    redirect("/towers?error=invalid");
  }
  if (!isFeatureEnabled("protocolTracking")) {
    redirect(`/towers/${input.towerId}?error=practice-unavailable`);
  }
  const result = await (await createServerPracticeCheckInRepository()).set(input);
  if (result.status === "available") {
    redirect(
      `/towers/${input.towerId}?status=${result.recorded ? "practice-recorded" : "practice-undone"}`,
    );
  }
  if (result.status === "rejected" && result.reason === "not_found") {
    redirect(`/towers/${input.towerId}?error=practice-not-found`);
  }
  if (result.status === "rejected") {
    redirect(`/towers/${input.towerId}?error=practice-invalid`);
  }
  redirect(`/towers/${input.towerId}?error=practice-unavailable`);
}

export async function deleteTower(formData: FormData): Promise<never> {
  await requirePrincipal();
  let identity;
  try {
    identity = parseIdentity(formData);
  } catch {
    redirect("/towers?error=invalid");
  }
  const result = await (
    await createServerPersonalTowerRepository()
  ).delete({
    id: identity.id,
    expectedRevision: identity.revision,
  });
  if (result.status === "available") redirect("/towers?status=deleted");
  if (result.status === "rejected" && result.reason === "conflict") {
    redirect(`/towers/${identity.id}?error=stale`);
  }
  redirect("/towers?error=not-found");
}
