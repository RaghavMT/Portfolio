import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { loginAsAdmin, sql } from "./helpers";

// FR-ADM-02: the dashboard cards and the profile checklist must match what is really in the TEST
// database. Other admin specs create and delete "E2E-" drafts at the same time, so every comparison
// polls until the page and a fresh SQL read agree instead of reading both once.
test.skip(({ isMobile }) => isMobile, "admin flows are viewport-independent");

const stamp = Date.now();

async function cleanup() {
  await sql`delete from projects where title like ${`E2E-dash-${stamp}%`}`;
}
test.beforeAll(cleanup);
test.afterAll(cleanup);

async function dbCounts() {
  const [row] = await sql`
    select
      (select count(*)::int from projects where status = 'published') as published,
      (select count(*)::int from projects where status = 'draft') as drafts,
      (select count(*)::int from messages
         where read_at is null and not archived) as unread`;
  return row as { published: number; drafts: number; unread: number };
}

const number = async (page: Page, testId: string) =>
  Number((await page.getByTestId(testId).textContent())?.trim());

test("cards show the real project and message counts", async ({ page }) => {
  await loginAsAdmin(page);

  await expect
    .poll(
      async () => {
        await page.goto("/admin");
        const [shown, real] = await Promise.all([
          Promise.all([
            number(page, "published-count"),
            number(page, "draft-count"),
            number(page, "unread-count"),
          ]),
          dbCounts(),
        ]);
        return (
          shown.join() === [real.published, real.drafts, real.unread].join()
        );
      },
      { timeout: 20_000 },
    )
    .toBe(true);
});

test("a new draft raises the Drafts card by one", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin");
  const before = await dbCounts();

  await sql`insert into projects (slug, title, summary, status)
    values (${`e2e-dash-${stamp}`}, ${`E2E-dash-${stamp}`}, 'dashboard draft', 'draft')`;
  expect((await dbCounts()).drafts).toBeGreaterThanOrEqual(before.drafts + 1);

  await expect
    .poll(
      async () => {
        await page.goto("/admin");
        return (
          (await number(page, "draft-count")) === (await dbCounts()).drafts
        );
      },
      { timeout: 20_000 },
    )
    .toBe(true);
  await cleanup();
});

test("each checklist item matches the database", async ({ page }) => {
  await loginAsAdmin(page);

  const expected = async () => {
    const [s] = await sql`
      select avatar_url, about_md, resume_url, seo_description,
        (select count(*)::int from projects where status = 'published') as published,
        (select count(*)::int from social_links where visible) as socials
      from site_settings where id = 1`;
    const real = (text: string) =>
      text.trim() !== "" && !/^todo\b/i.test(text.trim());
    return {
      avatar: !!s.avatar_url,
      about: real(s.about_md),
      projects: s.published >= 3,
      resume: !!s.resume_url,
      social: s.socials >= 1,
      seo: real(s.seo_description),
    };
  };

  await expect
    .poll(
      async () => {
        await page.goto("/admin");
        const shown: Record<string, boolean> = {};
        for (const key of [
          "avatar",
          "about",
          "projects",
          "resume",
          "social",
          "seo",
        ]) {
          shown[key] =
            (await page
              .getByTestId(`check-${key}`)
              .getAttribute("data-done")) === "true";
        }
        return JSON.stringify(shown) === JSON.stringify(await expected());
      },
      { timeout: 20_000 },
    )
    .toBe(true);

  await expect(page.getByTestId("checklist-summary")).toContainText(
    "of 6 done",
  );
});

test("quick actions and checklist links go to the right forms", async ({
  page,
}) => {
  await loginAsAdmin(page);
  await page.goto("/admin");

  await page.getByRole("link", { name: "+ New project" }).click();
  await expect(page).toHaveURL(/\/admin\/projects\/new$/);

  await page.goto("/admin");
  await page.getByRole("link", { name: "Replace resume" }).click();
  await expect(page).toHaveURL(/\/admin\/profile#resume$/);
  await expect(page.locator("#resume")).toBeVisible();

  await page.goto("/admin");
  await page.getByTestId("check-seo").click();
  await expect(page).toHaveURL(/\/admin\/settings#seo$/);
  await expect(page.locator("#seo")).toBeVisible();

  await page.goto("/admin");
  const site = page.getByRole("link", { name: /View site/ }).first();
  await expect(site).toHaveAttribute("href", "/");
  await expect(site).toHaveAttribute("target", "_blank");
});

test("dashboard is axe clean and has no horizontal scroll at 375 px", async ({
  page,
}) => {
  await loginAsAdmin(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/admin");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  const bad = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(bad, JSON.stringify(bad, null, 2)).toEqual([]);

  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/admin");
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
