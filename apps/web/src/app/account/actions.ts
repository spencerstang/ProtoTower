"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createServerAccountProfileRepository } from "@/lib/account-profile";
import { getVerifiedPrincipal } from "@/lib/auth";
import { parsePseudonym } from "@protostack/authorization";
import { redirect } from "next/navigation";

function formString(formData: FormData, name: string): string | null {
  const value = formData.get(name);
  return typeof value === "string" ? value : null;
}

export async function savePseudonym(formData: FormData): Promise<never> {
  const principal = await getVerifiedPrincipal();
  if (principal.status === "unavailable") redirect("/account?error=unavailable");
  if (principal.principal.kind !== "authenticated") redirect("/sign-in");

  let pseudonym;
  let expectedRevision: number | null;
  try {
    pseudonym = parsePseudonym(formString(formData, "pseudonym"));
    const rawRevision = formString(formData, "revision");
    expectedRevision = rawRevision === "" ? null : Number(rawRevision);
    if (
      expectedRevision !== null &&
      (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0)
    ) {
      throw new Error("Invalid revision");
    }
  } catch {
    redirect("/account?error=invalid");
  }

  const result = await (
    await createServerAccountProfileRepository()
  ).save(pseudonym, expectedRevision);
  if (result.status === "available") redirect("/account?status=saved");
  if (result.status === "rejected" && result.reason === "conflict") {
    redirect("/account?error=stale");
  }
  if (result.status === "rejected") redirect("/account?error=invalid");
  redirect("/account?error=unavailable");
}

export async function signOut(): Promise<never> {
  const client = await createSupabaseServerClient();
  if (client) await client.auth.signOut({ scope: "local" });
  redirect("/?status=signed-out");
}
