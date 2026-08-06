import { expect, test } from "@playwright/test";

test("public landing page renders without external services", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "beautiful tower of great habits",
  );
  await expect(
    page
      .getByRole("navigation", { name: "Primary navigation" })
      .getByText("Milestone 4", { exact: true }),
  ).toBeVisible();
});

test("catalog lists only the latest synthetic published protocols", async ({ page }) => {
  await page.goto("/protocols");

  await expect(page.getByRole("heading", { level: 1 })).toContainText("first blocks");
  await expect(page.getByRole("article")).toHaveCount(3);
  await expect(page.getByText("Morning outdoor cue")).toBeVisible();
  await expect(page.getByText("Version 2")).toBeVisible();
  await expect(page.getByText("Unpublished evening revision")).toHaveCount(0);
  await expect(page.getByText("Retired synthetic routine")).toHaveCount(0);
});

test("catalog navigation opens an immutable protocol detail", async ({ page }) => {
  await page.goto("/protocols");
  await page.getByRole("link", { name: "Open Morning outdoor cue" }).click();

  await expect(page).toHaveURL(/\/protocols\/morning-light-routine$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Morning outdoor cue");
  await expect(page.getByText("Published building block · Version 2")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Cautions" })).toBeVisible();
  await expect(page.getByText("General educational wellness information")).toBeVisible();
});

test("catalog distinguishes unavailable and not-found records", async ({ page }) => {
  await page.goto("/protocols/catalog-unavailable");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "This protocol could not be loaded",
  );

  await page.goto("/protocols/unknown-synthetic-routine");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Page not found");
  await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute("content", /noindex/);
});

test("health endpoint returns a non-sensitive response", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBe(true);
  const body: unknown = await response.json();
  expect(body).toMatchObject({ status: "ok" });
  expect(JSON.stringify(body)).not.toContain("gitSha");
});
