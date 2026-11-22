const protectedPath =
  /^\/(?:account|towers(?:\/new(?:\/detailed)?|\/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}(?:\/setup)?)?)$/iu;

export const authReturnCookieName = "protostack-auth-return";

export function parseAuthReturnPath(input: unknown): string | null {
  return typeof input === "string" && protectedPath.test(input) ? input : null;
}

export function signInPath(destination: string, error?: "invalid"): string {
  const query = new URLSearchParams();
  if (error) query.set("error", error);
  const next = parseAuthReturnPath(destination);
  if (next && next !== "/towers") query.set("next", next);
  return query.size ? `/sign-in?${query}` : "/sign-in";
}

export function returnPathFromEmailRedirect(input: string | null, origin: string): string | null {
  if (!input) return null;
  try {
    const redirect = new URL(input);
    if (redirect.origin !== origin || redirect.pathname !== "/auth/confirm") return null;
    return parseAuthReturnPath(redirect.searchParams.get("next"));
  } catch {
    return null;
  }
}
