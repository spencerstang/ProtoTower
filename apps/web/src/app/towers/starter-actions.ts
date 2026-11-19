"use server";

import { getVerifiedPrincipal } from "@/lib/auth";
import { createServerPersonalTowerRepository } from "@/lib/personal-towers";
import {
  matchStarterIntent,
  parseAdherenceStatus,
  parseStarterOutcomeNote,
  towerIdSchema,
} from "@protostack/tower-engine";
import type { Json } from "@protostack/database";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function formString(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function createStarterTower(formData: FormData): Promise<void> {
  const principal = await getVerifiedPrincipal();
  if (principal.status !== "available" || principal.principal.kind !== "authenticated") {
    redirect("/sign-in");
  }
  const matched = matchStarterIntent(formString(formData, "intent"));
  if (!matched.ok) redirect("/towers/new?error=invalid");

  const result = await (await createServerPersonalTowerRepository()).createStarter(matched);
  if (result.status === "available") redirect(`/towers/${result.value.id}`);
  if (result.status === "rejected" && result.reason === "limit_reached") {
    redirect("/towers/new?error=limit");
  }
  redirect("/towers/new?error=unavailable");
}

export async function recordStarterAdherence(formData: FormData): Promise<void> {
  const towerId = formString(formData, "towerId");
  const parsedId = towerIdSchema.safeParse(towerId);
  if (!parsedId.success) redirect("/towers?error=not-found");
  const tower = await (await createServerPersonalTowerRepository()).findById(parsedId.data);
  if (tower.status !== "available" || !tower.value?.starterMatchKey) {
    redirect(`/towers/${towerId}?error=adherence-invalid`);
  }
  const marks: { protocol_id: string; status: string }[] = [];
  for (const item of tower.value.items) {
    const status = parseAdherenceStatus(formString(formData, `mark.${item.protocolId}`));
    if (!status) redirect(`/towers/${tower.value.id}?error=adherence-invalid`);
    marks.push({ protocol_id: item.protocolId, status });
  }
  if (marks.length === 0) redirect(`/towers/${tower.value.id}?error=adherence-invalid`);

  const client = await createSupabaseServerClient();
  if (!client) redirect(`/towers/${tower.value.id}?error=unavailable`);
  const { error } = await client.rpc("record_starter_adherence", {
    candidate_tower_id: tower.value.id,
    candidate_marks: marks as Json,
  });
  if (error) redirect(`/towers/${tower.value.id}?error=adherence-invalid`);
  redirect(`/towers/${tower.value.id}?status=adherence-saved`);
}

export async function recordStarterOutcome(formData: FormData): Promise<void> {
  const towerId = formString(formData, "towerId");
  const parsedId = towerIdSchema.safeParse(towerId);
  if (!parsedId.success) redirect("/towers?error=not-found");
  const note = parseStarterOutcomeNote(formString(formData, "note"));
  if (!note) redirect(`/towers/${towerId}?error=outcome-invalid`);
  const tower = await (await createServerPersonalTowerRepository()).findById(parsedId.data);
  if (tower.status !== "available" || !tower.value?.starterMatchKey) {
    redirect(`/towers/${towerId}?error=outcome-invalid`);
  }

  const client = await createSupabaseServerClient();
  if (!client) redirect(`/towers/${tower.value.id}?error=unavailable`);
  const { error } = await client.rpc("record_starter_outcome", {
    candidate_tower_id: tower.value.id,
    candidate_skipped: note.skipped,
    candidate_text: note.text,
  });
  if (error) redirect(`/towers/${tower.value.id}?error=outcome-invalid`);
  redirect(`/towers/${tower.value.id}?status=outcome-saved`);
}
