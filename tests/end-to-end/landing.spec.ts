import { expect, test } from "@playwright/test";

test("public landing page introduces towers and opens the sign-in path for new users", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Find what works for you.");
  await expect(
    page.getByRole("list", { name: "Parts of a tower" }).getByRole("listitem"),
  ).toHaveText(["Goal", "Protocol", "Outcome"]);
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
  await expect(page.getByText("Account", { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Remember more of what you read." }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Start a tower" }).click();
  await expect(page).toHaveURL(/\/sign-in\?next=%2Ftowers%2Fnew$/u);
});

test("the mobile landing page keeps protocol browsing accessible", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Start a tower" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);

  await page.getByRole("link", { name: "Browse protocols" }).click();
  await expect(page).toHaveURL(/\/protocols$/u);
});

test("privacy and deletion routes disclose the open-beta data lifecycle", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Privacy in the open beta.");
  await expect(page.getByText("seven calendar days")).toBeVisible();
  await expect(page.getByText(/does not sell personal data/u)).toBeVisible();

  await page.getByRole("link", { name: "account deletion process" }).click();
  await expect(page).toHaveURL(/\/account-deletion$/u);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Request complete account deletion.",
  );
  await expect(page.getByText(/Deleting the authentication account cascades/u)).toBeVisible();
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
