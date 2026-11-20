import { spawnSync } from "node:child_process";

// Pin the destination so an environment-secret mistake cannot migrate production.
const stagingRef = "hrcqhbjrlwvparialkpa";
const { SUPABASE_PROJECT_ID, SUPABASE_DB_PASSWORD } = process.env;
if (SUPABASE_PROJECT_ID !== stagingRef || !SUPABASE_DB_PASSWORD) {
  console.error("Expected the verified staging project and a database password.");
  process.exit(1);
}

const databaseUrl = new URL("postgresql://aws-0-us-east-2.pooler.supabase.com:5432/postgres");
databaseUrl.username = `postgres.${stagingRef}`;
databaseUrl.password = encodeURIComponent(SUPABASE_DB_PASSWORD);
databaseUrl.searchParams.set("sslmode", "verify-full");

// GitHub already masks the password secret; also mask its encoded form and URL.
function mask(value) {
  const escaped = value.replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A");
  console.log(`::add-mask::${escaped}`);
}
mask(databaseUrl.password);
mask(databaseUrl.href);

console.log("Applying committed migrations and catalog seed to verified staging.");
const result = spawnSync(
  "supabase",
  ["db", "push", "--db-url", databaseUrl.href, "--include-all", "--include-seed", "--yes"],
  { stdio: "inherit" },
);
if (result.error) {
  console.error("Could not start the Supabase CLI.");
}
process.exit(result.status ?? 1);
