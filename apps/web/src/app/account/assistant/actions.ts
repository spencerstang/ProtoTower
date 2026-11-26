"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { towerIdSchema } from "@protostack/tower-engine";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function connect() {
  const client = await createSupabaseServerClient();
  const result = await client?.rpc("manage_tower_assistant", { operation: "connect" });
  const data = result?.data;
  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data) ||
    typeof data["token"] !== "string" ||
    !/^pta_[0-9a-f]{64}$/.test(data["token"])
  )
    return null;
  revalidatePath(`/account/assistant`);
  return data["token"];
}
export async function manage(form: FormData) {
  const tid = form.get("tid");
  const operation = form.get("operation"),
    proposal = form.get("proposal");
  if (operation !== "revoke" && operation !== "approve" && operation !== "decline")
    throw new Error("Invalid operation");
  const client = await createSupabaseServerClient();
  const result = await client?.rpc("manage_tower_assistant", {
    ...(tid ? { tid: towerIdSchema.parse(tid) } : {}),
    operation,
    ...(typeof proposal === "string" ? { proposal: towerIdSchema.parse(proposal) } : {}),
  });
  if (tid) revalidatePath(`/towers/${tid}`);
  revalidatePath(`/account/assistant`);
  redirect(`/account/assistant?result=${result && !result.error ? operation : "error"}`);
}
