import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type Locator } from "@playwright/test";
import { loginAsAdmin, sql, visitorPage } from "./helpers";

// FR-ADM-05 / FR-ADM-11 for certifications, education and experience against the TEST database.
// Same shape as admin-social.spec.ts: create → edit → hide → reorder → delete, each checked on the
// public site within 5 s, plus invalid input saving nothing.
test.describe.configure({ mode: "serial" });
test.skip(({ isMobile }) => isMobile, "admin flows are viewport-independent");

const stamp = Date.now();

type Entity = {
  title: string;
  path: string;
  noun: string;
  /** Table + column that holds the unique E2E name, for cleanup and order checks. */
  table: "certifications" | "education" | "experiences";
  column: "title" | "institution" | "company";
  /** Accessible name of the row (what the Edit/Delete/Move buttons are labelled with). */
  label: (name: string) => string;
  fill: (dialog: Locator, name: string) => Promise<void>;
  /** Edits the unique name field. */
  rename: (dialog: Locator, name: string) => Promise<void>;
  requiredError: string;
};

const entities: Entity[] = [
  {
    title: "Certifications",
    path: "/admin/certifications",
    noun: "certification",
    table: "certifications",
    column: "title",
    label: (n) => n,
    fill: async (d, n) => d.locator("#cert-title").fill(n),
    rename: async (d, n) => d.locator("#cert-title").fill(n),
    requiredError: "Required",
  },
  {
    title: "Education",
    path: "/admin/education",
    noun: "education",
    table: "education",
    column: "institution",
    label: (n) => `E2E Degree, ${n}`,
    fill: async (d, n) => {
      await d.locator("#edu-institution").fill(n);
      await d.locator("#edu-degree").fill("E2E Degree");
      await d.locator("#edu-start").fill("2022-08");
    },
    rename: async (d, n) => d.locator("#edu-institution").fill(n),
    requiredError: "Required",
  },
  {
    title: "Experience",
    path: "/admin/experience",
    noun: "experience",
    table: "experiences",
    column: "company",
    label: (n) => `E2E Role at ${n}`,
    fill: async (d, n) => {
      await d.locator("#exp-company").fill(n);
      await d.locator("#exp-title").fill("E2E Role");
      await d.locator("#exp-start").fill("2024-06");
    },
    rename: async (d, n) => d.locator("#exp-company").fill(n),
    requiredError: "Required",
  },
];

async function cleanup() {
  await sql`delete from certifications where title like 'E2E-%'`;
  await sql`delete from education where institution like 'E2E-%'`;
  await sql`delete from experiences where company like 'E2E-%'`;
}
test.beforeAll(cleanup);
test.afterAll(cleanup);

async function rowCount(table: Entity["table"]) {
  const rows = await sql.query(`select count(*)::int as n from ${table}`);
  return rows[0].n as number;
}

/** What a logged-out visitor sees: polls the public home page for up to 5 s (the AC window). */
async function expectPublic(browser: Browser, text: string, visible: boolean) {
  const visitor = await visitorPage(browser);
  try {
    await expect
      .poll(
        async () => {
          await visitor.page.goto("/");
          return visitor.page.getByText(text).count();
        },
        { timeout: 5000 },
      )
      [visible ? "toBeGreaterThan" : "toBe"](0);
  } finally {
    await visitor.close();
  }
}

for (const e of entities) {
  test.describe(e.title, () => {
    const NAME = `E2E-${stamp}-${e.noun}`;
    const RENAMED = `${NAME}-renamed`;
    const SECOND = `${NAME}-second`;

    test("invalid input shows inline errors and saves nothing", async ({
      page,
    }) => {
      await loginAsAdmin(page);
      await page.goto(e.path);
      const before = await rowCount(e.table);

      await page
        .getByRole("button", { name: `Add ${e.noun}` })
        .first()
        .click();
      const dialog = page.getByRole("dialog");
      await dialog.getByRole("button", { name: `Add ${e.noun}` }).click();

      await expect(dialog.getByText(e.requiredError).first()).toBeVisible();
      expect(await rowCount(e.table)).toBe(before);
    });

    test("create → edit → hide → reorder → delete, visible on the public site ≤ 5 s", async ({
      page,
      browser,
    }) => {
      await loginAsAdmin(page);
      await page.goto(e.path);

      // create
      await page
        .getByRole("button", { name: `Add ${e.noun}` })
        .first()
        .click();
      let dialog = page.getByRole("dialog");
      await e.fill(dialog, NAME);
      await dialog.getByRole("button", { name: `Add ${e.noun}` }).click();
      await expect(page.getByText("Saved — live on your site")).toBeVisible();
      await expectPublic(browser, NAME, true);

      // edit
      await page.getByRole("button", { name: `Edit ${e.label(NAME)}` }).click();
      dialog = page.getByRole("dialog");
      await e.rename(dialog, RENAMED);
      await dialog.getByRole("button", { name: "Save changes" }).click();
      await expect(page.getByText(RENAMED).first()).toBeVisible();
      await expectPublic(browser, RENAMED, true);

      // hide, then show again
      const visibleToggle = (state: "Visible" | "Hidden") =>
        page.getByRole("button", {
          name: new RegExp(`^${e.label(RENAMED)}: ${state}`),
        });
      await visibleToggle("Visible").click();
      await expect(visibleToggle("Hidden")).toBeVisible();
      await expectPublic(browser, RENAMED, false);
      await visibleToggle("Hidden").click();
      await expectPublic(browser, RENAMED, true);

      // reorder: add a second row, move it above the first
      await page
        .getByRole("button", { name: `Add ${e.noun}` })
        .first()
        .click();
      dialog = page.getByRole("dialog");
      await e.fill(dialog, SECOND);
      await dialog.getByRole("button", { name: `Add ${e.noun}` }).click();
      await expect(page.getByText(SECOND).first()).toBeVisible();

      await page
        .getByRole("button", {
          name: `Move ${e.noun} ${e.label(SECOND)} up`,
        })
        .click();
      await expect(
        page.getByText("Order saved — live on your site"),
      ).toBeVisible();
      await expect
        .poll(
          async () => {
            const rows = await sql.query(
              `select ${e.column} as name from ${e.table}
               where ${e.column} like 'E2E-%' order by sort_order`,
            );
            return rows.map((r) => r.name);
          },
          { timeout: 5000 },
        )
        .toEqual([SECOND, RENAMED]);

      // delete (with confirm)
      await page
        .getByRole("button", { name: `Delete ${e.label(RENAMED)}` })
        .click();
      const confirm = page.getByRole("alertdialog");
      await expect(confirm).toContainText(RENAMED);
      await confirm.getByRole("button", { name: "Delete" }).click();
      await expect(
        page.getByText("Deleted — gone from your site"),
      ).toBeVisible();
      await expectPublic(browser, RENAMED, false);
    });

    test("page is axe clean and has no horizontal scroll at 375 px", async ({
      page,
    }) => {
      await loginAsAdmin(page);
      await page.goto(e.path);
      await expect(page.getByRole("heading", { name: e.title })).toBeVisible();

      const results = await new AxeBuilder({ page }).analyze();
      const bad = results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical",
      );
      expect(bad, JSON.stringify(bad, null, 2)).toEqual([]);

      await page.setViewportSize({ width: 375, height: 800 });
      await page.goto(e.path);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  });
}
