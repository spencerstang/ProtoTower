import { expect, type APIRequestContext, type Page } from "@playwright/test";

const mailpitUrl = "http://127.0.0.1:54324";

export function isSessionCookie(name: string): boolean {
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

export async function requestAndConfirm(
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
