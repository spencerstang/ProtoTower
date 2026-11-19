import { expect, type Page } from "@playwright/test";

export async function submitDetailedTower(page: Page, title: string): Promise<void> {
  await page.goto("/towers/new/detailed");
  await page.getByRole("textbox", { name: "Goal or context", exact: true }).fill(title);
  await page.getByRole("textbox", { name: "Custom protocol name", exact: true }).fill("Custom cue");
  await page
    .getByRole("textbox", { name: "Custom how-to", exact: true })
    .fill("Do one small thing.");
  await page.getByRole("checkbox", { name: "Goal complete", exact: true }).check();
  await page.getByRole("button", { name: "Create tower", exact: true }).click();
  await expect(page).toHaveURL(/\/towers\/[0-9a-f-]{36}$/u);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
}
