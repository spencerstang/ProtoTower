import type { CookieOptions } from "@supabase/ssr";

export function serverOnlyCookieOptions(options: CookieOptions, secure: boolean): CookieOptions {
  return {
    ...options,
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
  };
}
