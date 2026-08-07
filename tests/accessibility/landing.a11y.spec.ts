import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { requestAndConfirm } from "../support/auth";

function seriousViolations(results: Awaited<ReturnType<AxeBuilder["analyze"]>>) {
  return results.violations.filter((violation) =>
    ["serious", "critical"].includes(violation.impact ?? ""),
  );
}

test("landing page has no automatically detectable serious accessibility violations", async ({
  page,
}) => {
  await page.goto("/");
  const results = await new AxeBuilder({ page }).analyze();
  expect(seriousViolations(results)).toEqual([]);
});

test("catalog listing has no automatically detectable serious accessibility violations", async ({
  page,
}) => {
  await page.goto("/protocols");
  const results = await new AxeBuilder({ page }).analyze();
  expect(seriousViolations(results)).toEqual([]);
});

test("protocol detail has no automatically detectable serious accessibility violations", async ({
  page,
}) => {
  await page.goto("/protocols/morning-light-routine");
  const results = await new AxeBuilder({ page }).analyze();
  expect(seriousViolations(results)).toEqual([]);
});

test("sign-in has no automatically detectable serious accessibility violations", async ({
  page,
}) => {
  await page.goto("/sign-in");
  const results = await new AxeBuilder({ page }).analyze();
  expect(seriousViolations(results)).toEqual([]);
});

test("generic confirmation failure is accessible", async ({ page }) => {
  await page.goto("/auth/confirm?error=invalid");
  const results = await new AxeBuilder({ page }).analyze();
  expect(seriousViolations(results)).toEqual([]);
});

test("private practice can be recorded and undone by keyboard without serious violations", async ({
  page,
  request,
}) => {
  await requestAndConfirm(page, request, "practice-a11y@example.test");
  await page.getByRole("link", { name: "Create your first tower" }).click();
  await page.getByLabel("Goal or context").fill("Synthetic accessible practice");
  await page.getByRole("button", { name: "Create tower" }).click();
  await page.getByRole("button", { name: "Add to Synthetic accessible practice" }).first().click();

  const date = page.getByLabel("Practice date");
  await expect(date).toBeVisible();
  const recordButton = page.getByRole("button", { name: /Record .* as practiced/u });
  await recordButton.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Recorded practice" })).toBeVisible();

  expect(seriousViolations(await new AxeBuilder({ page }).analyze())).toEqual([]);

  const undoButton = page.getByRole("button", { name: /Undo .* practice on/u });
  await undoButton.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "No recent practice recorded" })).toBeVisible();
});
