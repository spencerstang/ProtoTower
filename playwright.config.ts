import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const catalogMockURL = "http://127.0.0.1:54329";
const desktopChrome = devices["Desktop Chrome"];

if (!desktopChrome) {
  throw new Error("Playwright Desktop Chrome device descriptor is unavailable.");
}

const ciOptions = process.env.CI
  ? { forbidOnly: true, retries: 2, workers: 1 }
  : { forbidOnly: false, retries: 0 };
const localWebServer = process.env.PLAYWRIGHT_BASE_URL
  ? {}
  : {
      webServer: [
        {
          command: "node tests/support/protocol-catalog-server.mjs",
          url: `${catalogMockURL}/health`,
          reuseExistingServer: !process.env.CI,
          timeout: 30_000,
        },
        {
          command: "pnpm --filter @protostack/web dev",
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          env: {
            SUPABASE_URL: catalogMockURL,
            SUPABASE_ANON_KEY: "synthetic-playwright-anon-key",
          },
        },
      ],
    };

export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  ...ciOptions,
  reporter: process.env.CI ? [["html", { open: "never" }], ["github"]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  ...localWebServer,
  projects: [
    {
      name: "e2e",
      testDir: "tests/end-to-end",
      use: { ...desktopChrome },
    },
    {
      name: "accessibility",
      testDir: "tests/accessibility",
      use: { ...desktopChrome },
    },
    {
      name: "security",
      testDir: "tests/security",
      use: { ...desktopChrome },
    },
    {
      name: "performance",
      testDir: "tests/performance",
      use: { ...desktopChrome },
    },
  ],
});
