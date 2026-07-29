import type { ServerEnvironment } from "@protostack/configuration";

export function isDiagnosticsRequestAllowed(input: Readonly<{
  environment: ServerEnvironment;
  authorizationHeader: string | null;
}>): boolean {
  if (["local", "preview"].includes(input.environment.APP_ENV)) return true;
  const expected = input.environment.ADMIN_DIAGNOSTICS_TOKEN;
  if (!expected) return false;
  return input.authorizationHeader === `Bearer ${expected}`;
}
