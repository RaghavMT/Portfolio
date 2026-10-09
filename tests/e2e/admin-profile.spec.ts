import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { loginAsAdmin, sql, visitorPage } from "./helpers";

// FR-ADM-03 / FR-ADM-11 against the TEST database. The settings singleton is edited and then
// restored from a snapshot, so the seeded test DB is left unchanged.
test.describe.configure({ mode: "serial" });
test.skip(({ isMobile }) => isMobile, "admin flows are viewport-independent");

type Snapshot = {
  headline: string;
  tagline: string | null;
  about_md: string;
  session_version: number;
};
let snapshot: Snapshot;

test.beforeAll(async () => {
  const rows = await sql`
    select headline, tagline, about_md, session_version from site_settings where id = 1`;
  snapshot = rows[0] as Snapshot;
});
test.afterAll(async () => {
  await sql`
    update site_settings
    set headline = ${snapshot.headline}, tagline = ${snapshot.tagline}, about_md = ${snapshot.about_md}
    where id = 1`;
});

test("invalid input shows inline errors and saves nothing", async ({
  page,
}) => {
  await loginAsAdmin(page);
  await page.goto("/admin/profile");
  await page.getByLabel("Headline").fill("");
  await page.getByLabel("Contact email").fill("not-an-email");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Required").first()).toBeVisible();
  await expect(page.getByText("Enter a valid email")).toBeVisible();

  const rows = await sql`select headline from site_settings where id = 1`;
  expect(rows[0].headline).toBe(snapshot.headline);
});

test("edit → live on the public site ≤ 5 s; protected columns untouched", async ({
  page,
  browser,
}) => {
  const headline = `E2E-${Date.now()}-headline`;
  await loginAsAdmin(page);
  await page.goto("/admin/profile");
  await page.getByLabel("Headline").fill(headline);
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Saved — live on your site")).toBeVisible();

  const visitor = await visitorPage(browser);
  try {
    await expect
      .poll(
        async () => {
          await visitor.page.goto("/");
          return visitor.page.getByText(headline).count();
        },
        { timeout: 5000 },
      )
      .toBeGreaterThan(0);
  } finally {
    await visitor.close();
  }

  const rows =
    await sql`select session_version from site_settings where id = 1`;
  expect(rows[0].session_version).toBe(snapshot.session_version);
});

test("page is axe clean and has no horizontal scroll at 375 px", async ({
  page,
}) => {
  await loginAsAdmin(page);
  await page.goto("/admin/profile");
  await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  const bad = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(bad, JSON.stringify(bad, null, 2)).toEqual([]);

  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/admin/profile");
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
