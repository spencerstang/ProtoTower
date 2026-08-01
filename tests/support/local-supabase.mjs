import { execFileSync } from "node:child_process";

export function readLocalSupabaseStatus() {
  const output = execFileSync("pnpm", ["exec", "supabase", "status", "-o", "json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  const jsonStart = output.indexOf("{");
  const jsonEnd = output.lastIndexOf("}");
  if (jsonStart < 0 || jsonEnd < jsonStart) {
    throw new Error("Local Supabase status did not contain JSON.");
  }
  const value = JSON.parse(output.slice(jsonStart, jsonEnd + 1));
  if (
    typeof value !== "object" ||
    value === null ||
    typeof value.API_URL !== "string" ||
    typeof value.ANON_KEY !== "string" ||
    typeof value.SERVICE_ROLE_KEY !== "string" ||
    typeof value.MAILPIT_URL !== "string"
  ) {
    throw new Error("Local Supabase status has an unexpected shape.");
  }
  return {
    apiUrl: value.API_URL,
    anonKey: value.ANON_KEY,
    serviceRoleKey: value.SERVICE_ROLE_KEY,
    mailpitUrl: value.MAILPIT_URL,
  };
}
