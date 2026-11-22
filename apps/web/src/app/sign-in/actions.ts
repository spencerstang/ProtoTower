"use server";

import { parseEmailAddress } from "@protostack/authorization";
import { cookies } from "next/headers";
import { authReturnCookieName, parseAuthReturnPath, signInPath } from "@/lib/auth-return";
import { redirect } from "next/navigation";
import { getServerEnvironment } from "@/lib/runtime";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requestMagicLink(formData: FormData): Promise<never> {
  const next = parseAuthReturnPath(formData.get("next")) ?? "/towers";
  let email;
  try {
    email = parseEmailAddress(formData.get("email"));
  } catch {
    redirect(signInPath(next, "invalid"));
  }

  const cookieStore = await cookies();
  cookieStore.set(authReturnCookieName, next, {
    httpOnly: true,
    secure: process.env["APP_ENV"] !== "local",
    sameSite: "lax",
    maxAge: 900,
    path: "/auth",
  });
  const client = await createSupabaseServerClient();
  if (client) {
    try {
      const environment = getServerEnvironment();
      const siteUrl = environment.PUBLIC_APP_URL ?? "http://127.0.0.1:3000";
      const emailRedirect = new URL("/auth/confirm", siteUrl);
      emailRedirect.searchParams.set("next", next);
      await client.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: emailRedirect.toString(),
        },
      });
    } catch {
      // Every valid address receives the same application response.
    }
  }

  redirect("/auth/check-email");
}
