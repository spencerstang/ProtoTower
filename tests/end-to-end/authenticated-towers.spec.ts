import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const mailpitUrl = "http://127.0.0.1:54324";
const alphaEmail = "tower-alpha@example.test";
const betaEmail = "tower-beta@example.test";

function isSessionCookie(name: string): boolean {
  return name.includes("auth-token") && !name.includes("code-verifier");
}

function record(input: unknown): Readonly<Record<string, unknown>> | null {
  return typeof input === "object" && input !== null && !Array.isArray(input)
    ? (input as Readonly<Record<string, unknown>>)
    : null;
}

function messageForRecipient(input: unknown, email: string): string | null {
  const inbox = record(input);
  const messages = inbox?.["messages"];
  if (!Array.isArray(messages)) return null;
  for (const candidate of messages) {
    const message = record(candidate);
    const recipients = message?.["To"];
    const id = message?.["ID"];
    if (
      typeof id === "string" &&
      Array.isArray(recipients) &&
      recipients.some((recipient) => record(recipient)?.["Address"] === email)
    ) {
      return id;
    }
  }
  return null;
}

async function latestMagicLink(request: APIRequestContext, email: string): Promise<string> {
  let messageId: string | null = null;
  await expect
    .poll(
      async () => {
        const response = await request.get(`${mailpitUrl}/api/v1/messages`);
        messageId = messageForRecipient(await response.json(), email);
        return messageId;
      },
      { timeout: 10_000 },
    )
    .not.toBeNull();
  if (!messageId) throw new Error("Synthetic authentication email was not captured.");

  const response = await request.get(`${mailpitUrl}/api/v1/message/${messageId}`);
  const message = record(await response.json());
  const html = message?.["HTML"];
  if (typeof html !== "string") throw new Error("Captured email has no HTML body.");
  const href = html.match(/href="([^"]+)"/u)?.[1]?.replaceAll("&amp;", "&");
  if (!href) throw new Error("Captured email has no sign-in link.");
  return href;
}

async function requestAndConfirm(
  page: Page,
  request: APIRequestContext,
  email: string,
): Promise<string> {
  await page.goto("/sign-in");
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page).toHaveURL(/\/auth\/check-email$/u);
  const link = await latestMagicLink(request, email);

  await page.goto(link);
  await expect(page).toHaveURL(/\/auth\/confirm$/u);
  await expect(page.getByRole("button", { name: "Confirm and open my towers" })).toBeVisible();
  expect((await page.context().cookies()).some((cookie) => isSessionCookie(cookie.name))).toBe(
    false,
  );
  expect(await page.content()).not.toContain(new URL(link).searchParams.get("token_hash"));

  await page.getByRole("button", { name: "Confirm and open my towers" }).click();
  await expect(page).toHaveURL(/\/towers$/u);
  return link;
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
  page,
  request,
}) => {
  const alphaLink = await requestAndConfirm(page, request, alphaEmail);
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
  await page.getByRole("button", { name: "Remove" }).first().click();
  await expect(page.getByText("1 of 20 protocol blocks")).toBeVisible();

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

  await page.goto("/towers/new");
  await page.getByLabel("Goal or context").fill("Run a marathon");
  await page.getByRole("button", { name: "Create tower" }).click();
  await page.goto("/towers");
  await expect(page.getByRole("link", { name: /Sleep deeply/u })).toBeVisible();
  await expect(page.getByRole("link", { name: /Run a marathon/u })).toBeVisible();

  await page.goto("/protocols");
  await page.getByLabel("Add to a private tower").first().selectOption({ label: "Run a marathon" });
  await page.getByRole("button", { name: "Add protocol" }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Run a marathon");
  await expect(page.getByText("1 of 20 protocol blocks")).toBeVisible();

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
});
