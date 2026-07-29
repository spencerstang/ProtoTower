import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const migrationNames = (await readdir("supabase/migrations"))
  .filter((name) => name.endsWith(".sql"))
  .sort();

if (migrationNames.length === 0) {
  throw new Error("At least one migration is required.");
}

const namePattern = /^\d{14}_[a-z0-9_]+\.sql$/;
for (const name of migrationNames) {
  if (!namePattern.test(name)) {
    throw new Error(`Invalid migration filename: ${name}`);
  }
  const sql = await readFile(join("supabase/migrations", name), "utf8");
  if (!/^\s*begin;/i.test(sql) || !/commit;\s*$/i.test(sql)) {
    throw new Error(`${name} must be transaction-wrapped.`);
  }
  if (/service_role\s*=|password\s*=|secret\s*=/i.test(sql)) {
    throw new Error(`${name} appears to contain a credential.`);
  }
}

for (const name of (await readdir("supabase/seed")).filter((item) => item.endsWith(".sql"))) {
  const sql = await readFile(join("supabase/seed", name), "utf8");
  if (/\b(create|alter|drop)\s+(table|schema|type|function)\b/i.test(sql)) {
    throw new Error(`${name} contains schema DDL; seeds must contain data only.`);
  }
  if (!/synthetic/i.test(sql)) {
    throw new Error(`${name} must explicitly state that it is synthetic.`);
  }
}

console.log(`Migration check passed (${migrationNames.length} migration file).`);
