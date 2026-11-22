import { parseAuthReturnPath } from "./auth-return";

const tokenHashPattern = /^[A-Za-z0-9_-]{32,256}$/u;

export const authIntakeCookieName = "protostack-auth-intake";
export type AuthEmailOtpType = "email" | "signup";

export function parseAuthTokenHash(input: unknown): string | null {
  return typeof input === "string" && tokenHashPattern.test(input) ? input : null;
}

export function parseAuthEmailOtpType(input: unknown): AuthEmailOtpType | null {
  return input === "email" || input === "signup" ? input : null;
}

export function createAuthIntakeCookie(
  type: AuthEmailOtpType,
  tokenHash: string,
  next?: string | null,
): string {
  return next ? `${type}:${tokenHash}:${next}` : `${type}:${tokenHash}`;
}

export function parseAuthIntakeCookie(
  input: unknown,
): Readonly<{ tokenHash: string; type: AuthEmailOtpType; next?: string }> | null {
  if (typeof input !== "string") return null;
  const [rawType, rawToken, rawNext, ...extra] = input.split(":");
  const type = parseAuthEmailOtpType(rawType);
  const tokenHash = parseAuthTokenHash(rawToken);
  if (!type || !tokenHash || extra.length) return null;
  const next = parseAuthReturnPath(rawNext);
  return next ? { type, tokenHash, next } : { type, tokenHash };
}
