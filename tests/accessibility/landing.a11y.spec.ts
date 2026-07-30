import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("landing page has no automatically detectable serious accessibility violations", async ({
  page,
}) => {
  await page.goto("/");
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((violation) =>
    ["serious", "critical"].includes(violation.impact ?? ""),
  );
  expect(serious).toEqual([]);
});

test("catalog listing has no automatically detectable serious accessibility violations", async ({
  page,
}) => {
  await page.goto("/protocols");
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((violation) =>
    ["serious", "critical"].includes(violation.impact ?? ""),
  );
  expect(serious).toEqual([]);
});

test("protocol detail has no automatically detectable serious accessibility violations", async ({
  page,
}) => {
  await page.goto("/protocols/morning-light-routine");
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((violation) =>
    ["serious", "critical"].includes(violation.impact ?? ""),
  );
  expect(serious).toEqual([]);
});
