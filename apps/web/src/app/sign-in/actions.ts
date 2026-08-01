"use server";

import { parseEmailAddress } from "@protostack/authorization";
import { redirect } from "next/navigation";
import { getServerEnvironment } from "@/lib/runtime";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requestMagicLink(formData: FormData): Promise<never> {
  let email;
  try {
    email = parseEmailAddress(formData.get("email"));
  } catch {
    redirect("/sign-in?error=invalid");
  }

  const client = await createSupabaseServerClient();
  if (client) {
    try {
      const environment = getServerEnvironment();
      const siteUrl = environment.PUBLIC_APP_URL ?? "http://127.0.0.1:3000";
      await client.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${siteUrl.replace(/\/$/u, "")}/auth/confirm`,
        },
      });
    } catch {
      // Every valid address receives the same application response.
    }
  }

  redirect("/auth/check-email");
}
