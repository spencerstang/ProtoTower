interface CloudflareFetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

interface CloudflareEnv {
  APP_ENV: "local" | "preview" | "staging" | "production";
  APP_VERSION?: string;
  GIT_SHA?: string;
  BUILD_TIME?: string;
  PUBLIC_APP_URL?: string;
  PUBLIC_SUPPORT_EMAIL?: string;
  LOG_LEVEL?: "debug" | "info" | "warn" | "error";
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  ADMIN_DIAGNOSTICS_TOKEN?: string;
  ASSETS: CloudflareFetcher;
  WORKER_SELF_REFERENCE: CloudflareFetcher;
}
