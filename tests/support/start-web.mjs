import { spawn } from "node:child_process";
import { readLocalSupabaseStatus } from "./local-supabase.mjs";

const status = readLocalSupabaseStatus();
const environment = {
  ...process.env,
  APP_ENV: "local",
  PUBLIC_APP_URL: "http://127.0.0.1:3000",
  SUPABASE_URL: status.apiUrl,
  SUPABASE_ANON_KEY: status.anonKey,
  PROTOCOL_CATALOG_URL: "http://127.0.0.1:54329",
  PROTOCOL_CATALOG_ANON_KEY: "synthetic-playwright-anon-key",
};

const command = process.env.CI ? "start" : "dev";
const child = spawn("pnpm", ["--filter", "@protostack/web", command], {
  env: environment,
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

child.on("exit", (code) => process.exit(code ?? 1));
