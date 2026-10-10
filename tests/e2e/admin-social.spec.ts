import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { loginAsAdmin, sql, visitorPage } from "./helpers";

// FR-ADM-05 / FR-ADM-11 for social links against the TEST database. Serial and desktop-only for the
// same reason as auth.spec.ts (shared login_attempts table); the 375 px check resizes the viewport.
test.describe.configure({ mode: "serial" });
test.skip(({ isMobile }) => isMobile, "admin flows are viewport-independent");

const stamp = Date.now();
const NAME = `E2E-${stamp}`;
const RENAMED = `E2E-${stamp}-renamed`;
const OTHER = `E2E-${stamp}-second`;
const URL_1 = `https://example.com/e2e-${stamp}`;

async function cleanup() {
  await sql`delete from social_links where label like 'E2E-%'`;
}

test.beforeAll(cleanup);
test.afterAll(cleanup);

async function count() {
  const [row] = await sql`select count(*)::int as n from social_links`;
  return row.n as number;
}

/** What a logged-out visitor sees: polls the public home page for up to 5 s (the AC window). */
async function expectPublic(browser: Browser, label: string, visible: boolean) {
  const visitor = await visitorPage(browser);
  try {
    await expect
      .poll(
        async () => {
          await visitor.page.goto("/");
          return visitor.page.getByRole("link", { name: label }).count();
        },
        { timeout: 5000 },
      )
      [visible ? "toBeGreaterThan" : "toBe"](0);
  } finally {
    await visitor.close();
  }
}

async function openAdd(page: Page) {
  await page.getByRole("button", { name: "Add link" }).first().click();
  return page.getByRole("dialog");
}

async function pickOther(dialog: ReturnType<Page["getByRole"]>, page: Page) {
  await dialog.getByRole("combobox", { name: "Platform" }).click();
  await page.getByRole("option", { name: "Link", exact: true }).click();
}

test("invalid input shows inline errors and saves nothing", async ({
  page,
}) => {
  await loginAsAdmin(page);
  await page.goto("/admin/social");
  const before = await count();

  const dialog = await openAdd(page);
  await pickOther(dialog, page);
  await dialog.locator("#sl-url").fill("nope");
  await dialog.getByRole("button", { name: "Add link" }).click();

  await expect(dialog.getByText("Name this link")).toBeVisible();
  await expect(dialog.getByText("Use a full https:// link")).toBeVisible();
  expect(await count()).toBe(before);
});

test("create → edit → hide → reorder → delete, each visible on the public site ≤ 5 s", async ({
  page,
  browser,
}) => {
  // ~25 round trips to a remote database: the default 30 s is too tight (as for the project lifecycle, D29).
  test.setTimeout(90_000);
  await loginAsAdmin(page);
  await page.goto("/admin/social");

  // create
  const dialog = await openAdd(page);
  await pickOther(dialog, page);
  await dialog.locator("#sl-label").fill(NAME);
  await dialog.locator("#sl-url").fill(URL_1);
  await dialog.getByRole("button", { name: "Add link" }).click();
  await expect(page.getByText("Saved — live on your site")).toBeVisible();
  await expectPublic(browser, NAME, true);

  // edit
  await page.getByRole("button", { name: `Edit ${NAME}` }).click();
  const edit = page.getByRole("dialog");
  await edit.locator("#sl-label").fill(RENAMED);
  await edit.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText(RENAMED)).toBeVisible();
  await expectPublic(browser, RENAMED, true);

  // hide
  await page
    .getByRole("button", { name: new RegExp(`^${RENAMED}: Visible`) })
    .click();
  await expect(
    page.getByRole("button", { name: new RegExp(`^${RENAMED}: Hidden`) }),
  ).toBeVisible();
  await expectPublic(browser, RENAMED, false);
  await page
    .getByRole("button", { name: new RegExp(`^${RENAMED}: Hidden`) })
    .click();
  await expectPublic(browser, RENAMED, true);

  // reorder: add a second link, then move it above the first
  const second = await openAdd(page);
  await pickOther(second, page);
  await second.locator("#sl-label").fill(OTHER);
  await second.locator("#sl-url").fill(`https://example.com/e2e-${stamp}-2`);
  await second.getByRole("button", { name: "Add link" }).click();
  await expect(page.getByText(OTHER)).toBeVisible();

  await page.getByRole("button", { name: `Move link ${OTHER} up` }).click();
  await expect(page.getByText("Order saved — live on your site")).toBeVisible();
  await expect
    .poll(
      async () => {
        const rows = await sql`
          select label from social_links where label like 'E2E-%' order by sort_order`;
        return rows.map((r) => r.label);
      },
      { timeout: 5000 },
    )
    .toEqual([OTHER, RENAMED]);

  // delete (with confirm)
  await page.getByRole("button", { name: `Delete ${RENAMED}` }).click();
  const confirm = page.getByRole("alertdialog");
  await expect(confirm).toContainText(RENAMED);
  await confirm.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Deleted — gone from your site")).toBeVisible();
  await expectPublic(browser, RENAMED, false);
});

test("admin social page: axe clean and no horizontal scroll at 375 px", async ({
  page,
}) => {
  await loginAsAdmin(page);
  await page.goto("/admin/social");
  await expect(
    page.getByRole("heading", { name: "Social links" }),
  ).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  const bad = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(bad, JSON.stringify(bad, null, 2)).toEqual([]);

  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/admin/social");
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
