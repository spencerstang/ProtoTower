import { expect, test, type Page } from "@playwright/test";
import { isSessionCookie, requestAndConfirm } from "../support/auth";
import { submitDetailedTower } from "../support/towers";

const alphaEmail = "tower-alpha@example.test";
const betaEmail = "tower-beta@example.test";

async function removeOwnedTowers(page: Page): Promise<void> {
  await page.goto("/towers");
  const towerPaths = await page.locator(".tower-grid a").evaluateAll((links) =>
    links.flatMap((link) => {
      const href = link.getAttribute("href");
      return href?.match(/^\/towers\/[0-9a-f-]{36}$/u) ? [href] : [];
    }),
  );

  for (const towerPath of towerPaths) {
    await page.goto(towerPath);
    await page.getByRole("button", { name: "Delete tower" }).click();
    await expect(page).toHaveURL(/\/towers\?status=deleted$/u);
  }

  await page.goto("/towers");
  await expect(page.getByRole("heading", { name: "Start with one goal." })).toBeVisible();
}

test("a new address creates an account without an invitation", async ({ page, request }) => {
  await requestAndConfirm(page, request, "quiet-launch-new-user@example.test");
  await expect(page.getByRole("heading", { name: "Personal towers." })).toBeVisible();
  await expect(page.getByText("Account", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in" })).toHaveCount(0);

  await page.goto("/account");
  await expect(page.getByLabel("Pseudonym")).toHaveValue("Radiant Lynx");
  await page.getByRole("button", { name: "Suggest another" }).click();
  await expect(page.getByLabel("Pseudonym")).toHaveValue("Steady Comet");
  await page.getByRole("button", { name: "Use this pseudonym" }).click();
  await expect(
    page.getByText("✓ Pseudonym saved. ProtoTower will address you as Steady Comet."),
  ).toBeVisible();
  await expect(page.getByText("Steady Comet", { exact: true })).toBeVisible();
});

test("scanner-safe sign-in persists isolated goal-specific towers", async ({
  browser,
  page: initialPage,
  request,
}) => {
  test.setTimeout(90_000);
  let page = initialPage;
  const alphaLink = await requestAndConfirm(page, request, alphaEmail);
  await removeOwnedTowers(page);
  const authCookies = (await page.context().cookies()).filter((cookie) =>
    isSessionCookie(cookie.name),
  );
  expect(authCookies.length).toBeGreaterThan(0);
  expect(authCookies.every((cookie) => cookie.httpOnly && cookie.sameSite === "Lax")).toBe(true);

  await page.getByRole("link", { name: "Create your first tower" }).click();
  await submitDetailedTower(page, "Sleep better");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sleep better");
  const alphaTowerPath = new URL(page.url()).pathname;

  await page.getByRole("button", { name: "Add to Sleep better" }).first().click();
  await expect(page.getByText("1 of 20 protocol blocks")).toBeVisible();
  await page.getByRole("button", { name: "Add to Sleep better" }).first().click();
  await expect(page.getByText("2 of 20 protocol blocks")).toBeVisible();
  await page
    .getByRole("button", { name: /Move .* down/u })
    .first()
    .click();
  await expect(
    page.getByRole("region", { name: "Dated practice blocks" }).getByRole("heading", { level: 3 }),
  ).toHaveText(["Evening wind-down", "Desk movement breaks"]);
  let practicedBlock = page
    .locator(".tower-item-list > li")
    .filter({ hasText: "Evening wind-down" });
  await practicedBlock
    .getByRole("button", { name: "Record Evening wind-down as practiced" })
    .click();
  await expect(page.getByText("Practice recorded.")).toBeVisible();
  await expect(page.locator(".practice-history-list > li")).toHaveCount(1);
  await page
    .locator(".tower-item-list > li")
    .filter({ hasText: "Evening wind-down" })
    .getByRole("button", { name: "Record Evening wind-down as practiced" })
    .click();
  await expect(page.locator(".practice-history-list > li")).toHaveCount(1);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Recorded practice" })).toBeVisible();

  await page.goto("/towers");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/?status=signed-out$/u);
  await page.goto("/towers");
  await expect(page).toHaveURL(/\/sign-in$/u);

  const renewedContext = await browser.newContext();
  const renewedPage = await renewedContext.newPage();
  await requestAndConfirm(renewedPage, request, alphaEmail);
  await page.close();
  page = renewedPage;
  await page.goto(alphaTowerPath);
  await expect(page.locator(".practice-history-list > li")).toHaveCount(1);

  practicedBlock = page.locator(".tower-item-list > li").filter({ hasText: "Evening wind-down" });
  await practicedBlock.getByRole("button", { name: "Remove" }).click();
  await expect(page.getByText("1 of 20 protocol blocks")).toBeVisible();
  await expect(page.getByText("Removed from current tower")).toBeVisible();
  await page.getByRole("button", { name: /Undo Evening wind-down practice on/u }).click();
  await expect(page.getByText("Practice record removed.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "No recent practice recorded" })).toBeVisible();

  const stalePage = await page.context().newPage();
  await stalePage.goto(alphaTowerPath);
  await page.getByLabel("Tower name").fill("Sleep deeply");
  await page.getByRole("button", { name: "Rename" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sleep deeply");
  await stalePage.getByLabel("Tower name").fill("Stale overwrite");
  await stalePage.getByRole("button", { name: "Rename" }).click();
  await expect(stalePage.getByText("changed in another request")).toBeVisible();
  await expect(stalePage.getByRole("heading", { level: 1 })).toHaveText("Sleep deeply");
  await stalePage.close();
  await page.reload();
  await expect(page.getByText("1 of 20 protocol blocks")).toBeVisible();
  await page.getByRole("button", { name: "Record Desk movement breaks as practiced" }).click();
  await expect(page.locator(".practice-history-list > li")).toHaveCount(1);

  await page.goto("/towers/new");
  await submitDetailedTower(page, "Run a marathon");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Run a marathon");
  await page.goto("/towers");
  await expect(page.getByRole("link", { name: /Sleep deeply/u })).toBeVisible();
  await expect(page.getByRole("link", { name: /Run a marathon/u })).toBeVisible();

  await page.goto("/protocols");
  await page.getByLabel("Add to a private tower").first().selectOption({ label: "Run a marathon" });
  await page.getByRole("button", { name: "Add protocol" }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Run a marathon");
  await expect(page.getByText("1 of 20 protocol blocks")).toBeVisible();
  await expect(page.getByRole("heading", { name: "No recent practice recorded" })).toBeVisible();

  await page.goto("/towers/new");
  const xssTitle = '<img src=x onerror="alert(1)">';
  await submitDetailedTower(page, xssTitle);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(xssTitle);
  await expect(page.locator('img[src="x"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Delete tower" }).click();
  await expect(page).toHaveURL(/\/towers\?status=deleted$/u);

  const betaContext = await browser.newContext();
  const betaPage = await betaContext.newPage();
  await requestAndConfirm(betaPage, request, betaEmail);
  await expect(betaPage.getByRole("heading", { name: "Start with one goal." })).toBeVisible();
  const crossOwnerResponse = await betaPage.goto(alphaTowerPath);
  expect(crossOwnerResponse?.status()).toBe(404);
  await expect(betaPage.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await betaContext.close();

  await page.goto("/towers");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/?status=signed-out$/u);
  await page.goto("/towers");
  await expect(page).toHaveURL(/\/sign-in$/u);

  const replayContext = await browser.newContext();
  const replayPage = await replayContext.newPage();
  await replayPage.goto(alphaLink);
  await replayPage.getByRole("button", { name: "Confirm sign-in" }).click();
  await expect(
    replayPage.getByRole("heading", { name: "This sign-in link cannot be confirmed" }),
  ).toBeVisible();
  await replayContext.close();
  await renewedContext.close();
});

test("one question starts a reviewed pair or a tower with a manual next step", async ({
  page,
  request,
}) => {
  await requestAndConfirm(page, request, "starter-flow@example.invalid");
  await page.goto("/towers/new");
  await page
    .getByRole("textbox", { name: "What would you like to accomplish?", exact: true })
    .fill("Sleep better");
  await page.getByRole("button", { name: "Start" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sleep better");
  await expect(
    page.getByRole("link", { name: "Andrew Huberman: Daily sleep-wake blueprint" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Bryan Johnson: Pre-sleep resting-heart-rate routine" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Get outdoor morning light" })).toBeVisible();
  await expect(page.getByText("Never stare directly at the sun.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "This week", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Outcome this week" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Record .* as practiced/u })).toHaveCount(0);

  await page
    .getByRole("group", { name: "Andrew Huberman: Daily sleep-wake blueprint" })
    .getByLabel(/: Did this$/u)
    .check();
  await page
    .getByRole("group", { name: "Bryan Johnson: Pre-sleep resting-heart-rate routine" })
    .getByLabel(/: Skip$/u)
    .check();
  await page.getByRole("button", { name: "Save practice" }).click();
  await expect(page.getByText("Practice for this week was saved.")).toBeVisible();
  await page.getByRole("button", { name: "Save outcome" }).click();
  await expect(page.getByText("Outcome for this week was saved.")).toBeVisible();

  await page.goto("/towers/new");
  await page
    .getByRole("textbox", { name: "What would you like to accomplish?", exact: true })
    .fill("Work out 3x/week");
  await page.getByRole("button", { name: "Start" }).click();
  await expect(
    page.getByRole("link", { name: "Peter Attia: Centenarian Decathlon framework" }),
  ).toBeVisible();
  await expect(page.getByText("A second reviewed protocol was not added.")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Rhonda Patrick: Sauna and heat exposure" }),
  ).toHaveCount(0);

  await page.goto("/towers/new");
  await page
    .getByRole("textbox", { name: "What would you like to accomplish?", exact: true })
    .fill("Work out, then sauna");
  await page.getByRole("button", { name: "Start" }).click();
  await expect(
    page.getByRole("heading", { name: "Cautions from the sauna routine" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Rhonda Patrick: Sauna and heat exposure" }),
  ).toBeVisible();

  await page.goto("/towers/new");
  await page
    .getByRole("textbox", { name: "What would you like to accomplish?", exact: true })
    .fill("Save for a kitchen renovation");
  await page.getByRole("button", { name: "Start" }).click();
  await expect(
    page.getByRole("heading", { name: "Your tower is saved. Choose your next step." }),
  ).toBeVisible();
  await expect(
    page.getByText("It has not generated a plan or recommended a treatment."),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Get outdoor morning light" })).toHaveCount(0);
  const unmatchedPath = new URL(page.url()).pathname;
  await page.getByRole("link", { name: "Set up this tower yourself", exact: true }).click();
  await expect(page).toHaveURL((url) => url.pathname === `${unmatchedPath}/setup`);
  await expect(page.getByRole("textbox", { name: "Goal (required)", exact: true })).toHaveValue(
    "Save for a kitchen renovation",
  );
  await page
    .getByRole("textbox", { name: "Custom protocol name", exact: true })
    .fill("Weekly review");
  await page
    .getByRole("textbox", { name: "Custom protocol instructions", exact: true })
    .fill("Review the project budget.");
  await page
    .getByRole("checkbox", { name: "Goal complete (complete or incomplete)", exact: true })
    .check();
  await page.getByRole("button", { name: "Save tower setup", exact: true }).click();
  await expect(page.getByText("Tower saved.", { exact: true })).toBeVisible();
  await expect(page).toHaveURL((url) => url.pathname === unmatchedPath);
  await expect(
    page
      .locator(".owned-protocol-list")
      .getByRole("textbox", { name: "Name for Weekly review", exact: true }),
  ).toHaveValue("Weekly review");
  await expect(
    page.getByRole("link", { name: "Set up this tower yourself", exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page
      .locator(".owned-protocol-list")
      .getByRole("textbox", { name: "Name for Weekly review", exact: true }),
  ).toHaveValue("Weekly review");
});

test("setup errors retain every answer and dated measurements survive reload", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  await requestAndConfirm(page, request, "setup-retest@example.test");
  await page.goto("/towers/new");
  await page
    .getByRole("textbox", { name: "What would you like to accomplish?", exact: true })
    .fill("Synthetic measurement goal");
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your tower is saved. Choose your next step.", exact: true }),
  ).toBeVisible();
  const towerPath = new URL(page.url()).pathname;
  await page.getByRole("link", { name: "Set up this tower yourself", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Goal (required)", exact: true })
    .fill("Synthetic measurement goal");
  await page.getByLabel("Custom protocol name", { exact: true }).fill("First practice");
  await page
    .getByLabel("Custom protocol instructions", { exact: true })
    .fill("Do the first practice.");
  await page.getByText("Add another custom protocol", { exact: true }).click();
  await page.getByLabel("Second custom protocol name", { exact: true }).fill("Second practice");
  await page
    .getByLabel("Second custom protocol instructions", { exact: true })
    .fill("Do the second practice.");
  await page.getByText("Add a custom measure", { exact: true }).click();
  await page.locator("#custom-metric-name-1").fill("Concentration");
  await page.getByRole("button", { name: "Save tower setup", exact: true }).click();
  await expect(page.locator(".setup-error-summary")).toContainText("Choose what to record");
  await expect(page.getByRole("textbox", { name: "Goal (required)", exact: true })).toHaveValue(
    "Synthetic measurement goal",
  );
  await expect(page.getByLabel("Custom protocol name", { exact: true })).toHaveValue(
    "First practice",
  );
  await expect(page.getByLabel("Second custom protocol instructions", { exact: true })).toHaveValue(
    "Do the second practice.",
  );
  await expect(page.locator("#custom-metric-name-1")).toHaveValue("Concentration");
  const preview = page.locator(".protocol-preview summary").first();
  await expect(preview).toBeVisible();
  {
    await preview.click();
    await expect(page.locator(".protocol-preview[open]")).toHaveCount(1);
    await preview.click();
    await expect(page.getByLabel("Custom protocol name", { exact: true })).toHaveValue(
      "First practice",
    );
  }
  await page.locator("#custom-metric-shape-1").selectOption("number");
  await page.locator("#custom-metric-unit-1").fill("units/mL");
  await page.getByRole("button", { name: "Add a custom measure" }).click();
  await page.locator("#custom-metric-name-2").fill("Observation");
  await page.locator("#custom-metric-kind-2").selectOption("ongoing");
  await page.locator("#custom-metric-shape-2").selectOption("text");
  await page.getByRole("button", { name: "Add a custom measure" }).click();
  await page.locator("#custom-metric-name-3").fill("Practice count");
  await page.locator("#custom-metric-kind-3").selectOption("proxy");
  await page.locator("#custom-metric-shape-3").selectOption("count");
  await page.getByRole("button", { name: "Save tower setup", exact: true }).click();
  await expect(page).toHaveURL((url) => url.pathname === towerPath);
  await page.reload();
  await expect(page.locator(".owned-protocol-list > li")).toHaveCount(2);
  const blocks = page.getByRole("region", { name: "Tower blocks", exact: true });
  await expect(blocks).toContainText("2 of 20 configured protocols");
  await expect(blocks.getByRole("heading", { name: "First practice", exact: true })).toBeVisible();
  await expect(page.getByText("This tower has no blocks yet.")).toHaveCount(0);
  await expect(page.getByRole("spinbutton", { name: "Practice count", exact: true })).toBeVisible();
  await page.getByLabel("Measurement date", { exact: true }).fill("2020-02-03");
  await page.getByRole("textbox", { name: "Concentration", exact: true }).fill("3.250000");
  await page
    .getByRole("textbox", { name: "Observation", exact: true })
    .fill("Synthetic observation");
  await page.getByRole("button", { name: "Save check-in", exact: true }).click();
  await expect(page.locator(".measurement-history")).toContainText("3.250000");
  await page.getByLabel("Measurement date", { exact: true }).fill("2020-02-04");
  await page.getByRole("textbox", { name: "Concentration", exact: true }).fill("0");
  await page
    .getByRole("textbox", { name: "Observation", exact: true })
    .fill("Synthetic observation");
  await page.getByRole("button", { name: "Save check-in", exact: true }).click();
  await expect(page.locator(".measurement-history")).toContainText("2020-02-04");
  await page.reload();
  await expect(page.locator(".measurement-history tbody tr")).toHaveCount(4);
  await expect(page.locator(".measurement-history")).toContainText("2020-02-03");
  await expect(page.locator(".measurement-history")).toContainText("3.250000");
  await expect(page.locator(".measurement-history")).toContainText("units/mL");
});

test("sign-in returns to the requested page when email opens in another browser context", async ({
  browser,
  page,
  request,
}) => {
  const context = await browser.newContext();
  const confirmationPage = await context.newPage();
  await requestAndConfirm(page, request, "tower-return@example.test", {
    destination: "/towers/new/detailed",
    confirmationPage,
  });
  await expect(
    confirmationPage.getByRole("textbox", { name: "Goal (required)", exact: true }),
  ).toBeVisible();
  await context.close();
});

test("library personalizations and preset names keep their original definitions", async ({
  page,
  request,
}) => {
  await requestAndConfirm(page, request, "tower-personalization@example.test");
  await page.goto("/towers/new/detailed");
  await page
    .getByRole("textbox", { name: "Goal (required)", exact: true })
    .fill("Synthetic practice goal");
  const library = page.locator(".setup-choice-list > li");
  const firstProtocol = library.nth(0);
  const title = (await firstProtocol.locator("label").first().innerText()).trim();
  await firstProtocol.getByRole("checkbox").check();
  await firstProtocol
    .getByLabel(`My version of ${title} (optional)`, { exact: true })
    .fill("My original adaptation");
  await library.nth(1).getByRole("checkbox").check();
  await page.getByLabel("Custom protocol name", { exact: true }).fill("Personal practice");
  await page
    .getByLabel("Custom protocol instructions", { exact: true })
    .fill("Use the synthetic plan.");
  await expect(library.nth(2).getByRole("checkbox")).toBeDisabled();
  await expect(page.getByRole("button", { name: "Add another custom protocol" })).toBeDisabled();
  await page.getByRole("checkbox", { name: "Percent successful (0–100%)", exact: true }).check();
  await page
    .getByLabel("Display name for Percent successful (optional)")
    .fill("Planned sessions done");
  await page.getByRole("checkbox", { name: "How it feels (1–5)", exact: true }).check();
  await page.getByRole("button", { name: "Create tower", exact: true }).click();
  const blocks = page.getByRole("region", { name: "Tower blocks", exact: true });
  await expect(blocks).toContainText("3 of 20 configured protocols");
  await expect(blocks).toContainText("My original adaptation");
  await expect(blocks).toContainText(title);
  const rating = page.getByRole("spinbutton", { name: "How it feels", exact: true });
  await expect(rating).toHaveAccessibleDescription("1–5");
  const percent = page.getByRole("spinbutton", { name: "Planned sessions done", exact: true });
  await expect(percent).toHaveAccessibleDescription("0–100%");
  await percent.fill("75");
  await page.getByRole("button", { name: "Save check-in", exact: true }).click();
  await expect(page.getByText("Check-in saved.", { exact: true })).toBeVisible();
  await page
    .getByLabel("Display name for Planned sessions done", { exact: true })
    .fill("Sessions done");
  await page
    .getByRole("button", { name: "Save measure name: Planned sessions done", exact: true })
    .click();
  await expect(page.getByRole("spinbutton", { name: "Sessions done", exact: true })).toHaveValue(
    "75",
  );
  await page
    .getByLabel(`My version of ${title} (optional)`, { exact: true })
    .fill("My updated adaptation");
  await page.getByRole("button", { name: `Save protocol: ${title}`, exact: true }).click();
  await expect(blocks).toContainText("My updated adaptation");
  await page.reload();
  await expect(blocks).toContainText("My updated adaptation");
});
