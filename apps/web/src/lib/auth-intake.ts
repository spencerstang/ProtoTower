const tokenHashPattern = /^[A-Za-z0-9_-]{32,256}$/u;

export const authIntakeCookieName = "protostack-auth-intake";
export type AuthEmailOtpType = "email" | "signup";

export function parseAuthTokenHash(input: unknown): string | null {
  return typeof input === "string" && tokenHashPattern.test(input) ? input : null;
}

export function parseAuthEmailOtpType(input: unknown): AuthEmailOtpType | null {
  return input === "email" || input === "signup" ? input : null;
}

export function createAuthIntakeCookie(type: AuthEmailOtpType, tokenHash: string): string {
  return `${type}:${tokenHash}`;
}

export function parseAuthIntakeCookie(
  input: unknown,
): Readonly<{ tokenHash: string; type: AuthEmailOtpType }> | null {
  if (typeof input !== "string") return null;
  const separator = input.indexOf(":");
  const type = parseAuthEmailOtpType(input.slice(0, separator));
  const tokenHash = parseAuthTokenHash(input.slice(separator + 1));
  return type && tokenHash ? { tokenHash, type } : null;
}
