import { neon } from "@neondatabase/serverless";
import { expect, type Browser, type Page } from "@playwright/test";
import { E2E_PASSWORD } from "./constants";

/** Raw SQL against the TEST database (the Playwright config refuses to run without it). */
export const sql = neon(process.env.DATABASE_URL_TEST!);

export async function logIn(page: Page, password = E2E_PASSWORD) {
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

/** Signs in and lands on the dashboard; clears lockout state first so tests can't lock each other out. */
export async function loginAsAdmin(page: Page) {
  await sql`delete from login_attempts`;
  await page.goto("/admin/login");
  await logIn(page);
  await expect(page).toHaveURL(/\/admin$/);
}

/** A fresh, logged-out visitor (new context) — what the public sees after a change. */
export async function visitorPage(browser: Browser) {
  const context = await browser.newContext();
  return { page: await context.newPage(), close: () => context.close() };
}
