import type { Database } from "@protostack/database";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getServerEnvironment } from "../runtime";
import { serverOnlyCookieOptions } from "./cookies";

export type SupabaseConnection = Readonly<{ url: string; anonKey: string; secure: boolean }>;

export function getSupabaseConnection(): SupabaseConnection | null {
  try {
    const environment = getServerEnvironment();
    if (!environment.SUPABASE_URL || !environment.SUPABASE_ANON_KEY) return null;
    return {
      url: environment.SUPABASE_URL,
      anonKey: environment.SUPABASE_ANON_KEY,
      secure: environment.APP_ENV !== "local",
    };
  } catch {
    return null;
  }
}

export async function createSupabaseServerClient(): Promise<SupabaseClient<Database> | null> {
  const connection = getSupabaseConnection();
  if (!connection) return null;
  const cookieStore = await cookies();

  return createServerClient<Database>(connection.url, connection.anonKey, {
    cookieOptions: {
      httpOnly: true,
      secure: connection.secure,
      sameSite: "lax",
      path: "/",
    },
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, serverOnlyCookieOptions(options, connection.secure));
          });
        } catch {
          // Server Components cannot mutate response cookies. The proxy refreshes them.
        }
      },
    },
  });
}
