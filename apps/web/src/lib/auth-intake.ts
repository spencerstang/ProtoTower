const tokenHashPattern = /^[A-Za-z0-9_-]{32,256}$/u;

export const authIntakeCookieName = "protostack-auth-intake";

export function parseAuthTokenHash(input: unknown): string | null {
  return typeof input === "string" && tokenHashPattern.test(input) ? input : null;
}
