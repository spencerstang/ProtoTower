import {
  anonymousPrincipal,
  parseAuthenticatedPrincipal,
  type Principal,
} from "@protostack/authorization";
import { cookies } from "next/headers";
import { createSupabaseServerClient, getSupabaseConnection } from "./supabase/server";

export type PrincipalResult =
  Readonly<{ status: "available"; principal: Principal }> | Readonly<{ status: "unavailable" }>;

function hasSessionCookie(cookieNames: readonly string[]): boolean {
  return cookieNames.some((name) => name.startsWith("sb-") && name.includes("-auth-token"));
}

export async function getVerifiedPrincipal(): Promise<PrincipalResult> {
  if (!getSupabaseConnection()) return { status: "unavailable" };
  const cookieStore = await cookies();
  const hadSessionCookie = hasSessionCookie(cookieStore.getAll().map(({ name }) => name));
  const client = await createSupabaseServerClient();
  if (!client) return { status: "unavailable" };

  try {
    const { data, error } = await client.auth.getClaims();
    if (error || !data?.claims.sub) {
      return hadSessionCookie
        ? { status: "unavailable" }
        : { status: "available", principal: anonymousPrincipal };
    }
    return {
      status: "available",
      principal: parseAuthenticatedPrincipal({ id: data.claims.sub }),
    };
  } catch {
    return hadSessionCookie
      ? { status: "unavailable" }
      : { status: "available", principal: anonymousPrincipal };
  }
}
