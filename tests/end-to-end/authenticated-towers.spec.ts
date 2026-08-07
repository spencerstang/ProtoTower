import { expect, test, type Page } from "@playwright/test";
import { isSessionCookie, requestAndConfirm } from "../support/auth";

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

test("valid and unknown addresses receive the same application response", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email address").fill("unknown-invite@example.test");
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByRole("heading", { name: "Check your email." })).toBeVisible();
  await expect(page.getByText("same message appears for every address")).toBeVisible();
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
  await page.getByLabel("Goal or context").fill("Sleep better");
  await page.getByRole("button", { name: "Create tower" }).click();
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
  await expect(page.locator(".tower-item-list h3")).toHaveText([
    "Evening wind-down",
    "Desk movement breaks",
  ]);
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
  await page.getByLabel("Goal or context").fill("Run a marathon");
  await page.getByRole("button", { name: "Create tower" }).click();
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
  await page.getByLabel("Goal or context").fill(xssTitle);
  await page.getByRole("button", { name: "Create tower" }).click();
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
  await replayPage.getByRole("button", { name: "Confirm and open my towers" }).click();
  await expect(
    replayPage.getByRole("heading", { name: "This sign-in link cannot be confirmed" }),
  ).toBeVisible();
  await replayContext.close();
  await renewedContext.close();
});
