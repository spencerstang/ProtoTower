import { expect, test } from "@playwright/test";
import { requestAndConfirm } from "../support/auth";

test("landing page DOM content is available within the foundation budget", async ({ page }) => {
  const startedAt = Date.now();
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const elapsed = Date.now() - startedAt;
  expect(elapsed).toBeLessThan(process.env.CI ? 5_000 : 3_000);
});

test("catalog DOM content is available within the established budget", async ({ page }) => {
  const startedAt = Date.now();
  await page.goto("/protocols", { waitUntil: "domcontentloaded" });
  const elapsed = Date.now() - startedAt;

  await expect(page.getByRole("article")).toHaveCount(3);
  expect(elapsed).toBeLessThan(process.env.CI ? 5_000 : 3_000);
});

test("private practice history stays within the route budget and narrow viewport", async ({
  page,
  request,
}) => {
  await requestAndConfirm(page, request, "practice-performance@example.test");
  await page.getByRole("link", { name: "Create your first tower" }).click();
  await page.getByLabel("Goal or context").fill("Synthetic performance practice");
  await page.getByRole("button", { name: "Create tower" }).click();
  await page.getByRole("button", { name: "Add to Synthetic performance practice" }).first().click();
  await page.getByRole("button", { name: /Record .* as practiced/u }).click();
  const towerPath = new URL(page.url()).pathname;

  const startedAt = Date.now();
  await page.goto(towerPath, { waitUntil: "domcontentloaded" });
  const elapsed = Date.now() - startedAt;
  await expect(page.getByRole("heading", { name: "Recorded practice" })).toBeVisible();
  expect(elapsed).toBeLessThan(process.env.CI ? 5_000 : 3_000);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});
