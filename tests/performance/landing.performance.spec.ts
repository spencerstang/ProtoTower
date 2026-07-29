import { expect, test } from "@playwright/test";

test(
  "landing page DOM content is available within the foundation budget",
  async ({ page }) => {
    const startedAt = Date.now();
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const elapsed = Date.now() - startedAt;
    expect(elapsed).toBeLessThan(process.env.CI ? 5_000 : 3_000);
  },
);
