import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser } from "@playwright/test";
import { loginAsAdmin, sql, visitorPage } from "./helpers";

// FR-ADM-06 / FR-ADM-11 for skills against the TEST database: group + chip lifecycle, each change
// checked on the public site within 5 s, plus invalid input saving nothing.
test.describe.configure({ mode: "serial" });
test.skip(({ isMobile }) => isMobile, "admin flows are viewport-independent");

const stamp = Date.now();
const GROUP = `E2E-${stamp}-group`;
const RENAMED = `${GROUP}-renamed`;
const SKILL_A = `E2E-${stamp}-alpha`;
const SKILL_B = `E2E-${stamp}-beta`;

async function cleanup() {
  await sql`delete from skill_groups where name like 'E2E-%'`;
}
test.beforeAll(cleanup);
test.afterAll(cleanup);

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

test("invalid input shows inline errors and saves nothing", async ({
  page,
}) => {
  await loginAsAdmin(page);
  await page.goto("/admin/skills");
  const before = await sql`select count(*)::int as n from skill_groups`;

  await page.getByRole("button", { name: "Add skill group" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Add group" }).click();
  await expect(dialog.getByText("Required").first()).toBeVisible();

  const after = await sql`select count(*)::int as n from skill_groups`;
  expect(after[0].n).toBe(before[0].n);
});

test("group and chip lifecycle, visible on the public site ≤ 5 s", async ({
  page,
  browser,
}) => {
  await loginAsAdmin(page);
  await page.goto("/admin/skills");

  // create group, add two skills
  await page.getByRole("button", { name: "Add skill group" }).first().click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Group name").fill(GROUP);
  await dialog.getByRole("button", { name: "Add group" }).click();
  await expect(page.getByText("Saved — live on your site")).toBeVisible();

  const input = page.getByLabel(`Add a skill to ${GROUP}`);
  await input.fill(SKILL_A);
  await input.press("Enter");
  await expect(
    page.getByRole("button", { name: `Remove ${SKILL_A}` }),
  ).toBeVisible();
  await expectPublic(browser, SKILL_A, true);

  await input.fill(SKILL_B);
  await input.press("Enter");
  await expect(
    page.getByRole("button", { name: `Remove ${SKILL_B}` }),
  ).toBeVisible();

  // a duplicate (different case) is rejected with an inline error
  await input.fill(SKILL_A.toUpperCase());
  await input.press("Enter");
  await expect(
    page.getByText("That skill is already in this group."),
  ).toBeVisible();
  await input.fill("");

  // reorder chips: move B left of A
  await page.getByRole("button", { name: `Move ${SKILL_B} left` }).click();
  await expect
    .poll(
      async () => {
        const rows = await sql`
          select s.name from skills s join skill_groups g on g.id = s.group_id
          where g.name = ${GROUP} order by s.sort_order`;
        return rows.map((r) => r.name);
      },
      { timeout: 5000 },
    )
    .toEqual([SKILL_B, SKILL_A]);

  // remove a chip
  await page.getByRole("button", { name: `Remove ${SKILL_B}` }).click();
  await expectPublic(browser, SKILL_B, false);

  // rename the group
  await page.getByRole("button", { name: `Edit ${GROUP}` }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Group name").fill(RENAMED);
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText(RENAMED).first()).toBeVisible();

  // hide, then show again
  const toggle = (state: "Visible" | "Hidden") =>
    page.getByRole("button", { name: new RegExp(`^${RENAMED}: ${state}`) });
  await toggle("Visible").click();
  await expect(toggle("Hidden")).toBeVisible();
  await expectPublic(browser, SKILL_A, false);
  await toggle("Hidden").click();
  await expectPublic(browser, SKILL_A, true);

  // reorder groups: add a second group and move it up
  await page.getByRole("button", { name: "Add skill group" }).first().click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Group name").fill(`${GROUP}-second`);
  await dialog.getByRole("button", { name: "Add group" }).click();
  await expect(page.getByText(`${GROUP}-second`).first()).toBeVisible();
  await page
    .getByRole("button", { name: `Move skill group ${GROUP}-second up` })
    .click();
  await expect(page.getByText("Order saved — live on your site")).toBeVisible();
  await expect
    .poll(
      async () => {
        const rows = await sql`
          select name from skill_groups where name like 'E2E-%' order by sort_order`;
        return rows.map((r) => r.name);
      },
      { timeout: 5000 },
    )
    .toEqual([`${GROUP}-second`, RENAMED]);

  // delete with confirm: the dialog says how many skills go with it
  await page.getByRole("button", { name: `Delete ${RENAMED}` }).click();
  const confirm = page.getByRole("alertdialog");
  await expect(confirm).toContainText("deletes the group and its 1 skill");
  await confirm.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Deleted — gone from your site")).toBeVisible();
  await expectPublic(browser, SKILL_A, false);
});

test("page is axe clean and has no horizontal scroll at 375 px", async ({
  page,
}) => {
  await loginAsAdmin(page);
  await page.goto("/admin/skills");
  await expect(page.getByRole("heading", { name: "Skills" })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  const bad = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(bad, JSON.stringify(bad, null, 2)).toEqual([]);

  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/admin/skills");
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
