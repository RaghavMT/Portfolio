import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { logIn, sql } from "./helpers";

// FR-ADM-01 / SEC-01..03 / SEC-06 against the TEST database. Serial, desktop only: the lockout
// counters live in one shared table, and the rest is viewport-independent.
test.describe.configure({ mode: "serial" });
test.skip(({ isMobile }) => isMobile, "auth flow is viewport-independent");
// A private client IP (the first x-forwarded-for hop, D23) keeps the lockout counters here apart from
// the admin specs, which log in from the default IP in parallel workers.
test.use({ extraHTTPHeaders: { "x-forwarded-for": "203.0.113.50" } });

test.beforeEach(async () => {
  // Test DB only (guarded by the config); clears lockout state between tests.
  await sql`delete from login_attempts`;
});

test("logged-out /admin/* redirects to login and remembers the target", async ({
  page,
}) => {
  await page.goto("/admin/projects");
  await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Fprojects$/);
  await expect(
    page.getByRole("heading", { name: "Admin login" }),
  ).toBeVisible();
});

test("wrong password shows a generic error and stays on login", async ({
  page,
}) => {
  await page.goto("/admin/login");
  await logIn(page, "not-the-password");
  await expect(page.locator("#login-error")).toHaveText("Incorrect password.");
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("five wrong passwords lock the IP, even for the right password", async ({
  page,
}) => {
  await page.goto("/admin/login");
  for (let i = 0; i < 5; i++) {
    await logIn(page, "wrong-" + i);
    await expect(page.locator("#login-error")).toHaveText(
      "Incorrect password.",
    );
  }
  await logIn(page);
  await expect(page.locator("#login-error")).toContainText("Try again later");
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("correct password lands on the requested admin page with safe cookie flags", async ({
  page,
  context,
}) => {
  await page.goto("/admin/projects");
  await logIn(page);
  await expect(page).toHaveURL(/\/admin\/projects$/);
  await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();

  const cookie = (await context.cookies()).find(
    (c) => c.name === "admin_session",
  );
  expect(cookie).toBeDefined();
  expect(cookie).toMatchObject({
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
  });
});

test("an off-site next= target is ignored after login", async ({ page }) => {
  await page.goto("/admin/login?next=//evil.example");
  await logIn(page);
  await expect(page).toHaveURL(/\/admin$/);
});

test("a logged-in visitor on /admin/login is sent to the dashboard", async ({
  page,
}) => {
  await page.goto("/admin/login");
  await logIn(page);
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/admin/login");
  await expect(page).toHaveURL(/\/admin$/);
});

test("bumping the session version logs existing sessions out", async ({
  page,
}) => {
  await page.goto("/admin/login");
  await logIn(page);
  await expect(page).toHaveURL(/\/admin$/);

  await sql`update site_settings set session_version = session_version + 1 where id = 1`;
  try {
    await page.goto("/admin/projects");
    await expect(page).toHaveURL(/\/admin\/login/);
  } finally {
    await sql`update site_settings set session_version = session_version - 1 where id = 1`;
  }
});

test("log out clears the session", async ({ page }) => {
  await page.goto("/admin/login");
  await logIn(page);
  await page
    .getByRole("navigation", { name: "Admin" })
    .getByRole("button", { name: "Log out" })
    .click();
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("security headers: everywhere, plus no-store/noindex on /admin", async ({
  request,
}) => {
  const home = await request.get("/");
  expect(home.headers()["x-content-type-options"]).toBe("nosniff");
  expect(home.headers()["strict-transport-security"]).toContain(
    "max-age=63072000",
  );
  expect(home.headers()["referrer-policy"]).toBe(
    "strict-origin-when-cross-origin",
  );
  expect(home.headers()["permissions-policy"]).toBe(
    "camera=(), microphone=(), geolocation=()",
  );
  expect(home.headers()["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );
  expect(home.headers()["cache-control"] ?? "").not.toContain("no-store");

  const login = await request.get("/admin/login");
  expect(login.headers()["cache-control"]).toContain("no-store");
  expect(login.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  expect(login.headers()["x-content-type-options"]).toBe("nosniff");
});

test("login page has no serious/critical axe violations", async ({ page }) => {
  await page.goto("/admin/login");
  const results = await new AxeBuilder({ page }).analyze();
  const bad = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(bad, JSON.stringify(bad, null, 2)).toEqual([]);
});
