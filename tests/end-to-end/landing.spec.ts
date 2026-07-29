import { expect, test } from "@playwright/test";

test("public landing page renders without external services", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "what actually helps",
  );
  await expect(page.getByText("Foundation online")).toBeVisible();
});

test("health endpoint returns a non-sensitive response", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBe(true);
  const body: unknown = await response.json();
  expect(body).toMatchObject({ status: "ok" });
  expect(JSON.stringify(body)).not.toContain("gitSha");
});
