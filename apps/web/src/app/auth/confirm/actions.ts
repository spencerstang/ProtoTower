"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authIntakeCookieName, parseAuthIntakeCookie } from "@/lib/auth-intake";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function confirmMagicLink(): Promise<never> {
  const cookieStore = await cookies();
  const intake = parseAuthIntakeCookie(cookieStore.get(authIntakeCookieName)?.value);
  cookieStore.delete({ name: authIntakeCookieName, path: "/auth" });
  if (!intake) redirect("/auth/confirm?error=invalid");

  const client = await createSupabaseServerClient();
  if (!client) redirect("/auth/confirm?error=invalid");

  try {
    const { error } = await client.auth.verifyOtp({
      token_hash: intake.tokenHash,
      type: intake.type,
    });
    if (error) redirect("/auth/confirm?error=invalid");
  } catch {
    redirect("/auth/confirm?error=invalid");
  }
  redirect("/towers");
}
