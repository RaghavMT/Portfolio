import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser } from "@playwright/test";
import { loginAsAdmin, sql, visitorPage } from "./helpers";

// FR-ADM-08 / FR-ADM-11 against the TEST database. The settings singleton is restored from a
// snapshot afterwards, so the seeded test DB is left unchanged.
test.describe.configure({ mode: "serial" });
test.skip(({ isMobile }) => isMobile, "admin flows are viewport-independent");

type Snapshot = {
  sections: unknown;
  accent: string;
  seo_title: string | null;
  seo_description: string;
  contact_form_enabled: boolean;
};
let snapshot: Snapshot;

test.beforeAll(async () => {
  const rows = await sql`
    select sections, accent, seo_title, seo_description, contact_form_enabled
    from site_settings where id = 1`;
  snapshot = rows[0] as Snapshot;
});
test.afterAll(async () => {
  await sql`
    update site_settings
    set sections = ${JSON.stringify(snapshot.sections)}::jsonb, accent = ${snapshot.accent},
        seo_title = ${snapshot.seo_title}, seo_description = ${snapshot.seo_description},
        contact_form_enabled = ${snapshot.contact_form_enabled}
    where id = 1`;
});

async function setting<T>(column: string): Promise<T> {
  const rows = await sql.query(
    `select ${column} as v from site_settings where id = 1`,
  );
  return rows[0].v as T;
}

async function publicAccent(browser: Browser) {
  const visitor = await visitorPage(browser);
  try {
    await visitor.page.goto("/");
    return await visitor.page
      .locator("[data-accent]")
      .first()
      .getAttribute("data-accent");
  } finally {
    await visitor.close();
  }
}

test("sections: reorder and hide are saved and reach the public site ≤ 5 s", async ({
  page,
  browser,
}) => {
  await loginAsAdmin(page);
  await page.goto("/admin/settings");

  // reorder: move the last section up one place
  const before = (await setting<{ key: string }[]>("sections")).map(
    (s) => s.key,
  );
  const last = before[before.length - 1];
  const label = last[0].toUpperCase() + last.slice(1);
  await page
    .getByRole("button", { name: `Move section ${label} up`, exact: true })
    .click();
  await expect(page.getByText("Order saved — live on your site")).toBeVisible();
  await expect
    .poll(
      async () =>
        (await setting<{ key: string }[]>("sections")).map((s) => s.key),
      { timeout: 5000 },
    )
    .toEqual([...before.slice(0, -2), last, before[before.length - 2]]);

  // hide the Skills section, then show it again
  const toggle = (state: "Visible" | "Hidden") =>
    page.getByRole("button", { name: new RegExp(`^Skills: ${state}`) });
  await toggle("Visible").click();
  await expect(toggle("Hidden")).toBeVisible();
  const visitor = await visitorPage(browser);
  try {
    await expect
      .poll(
        async () => {
          await visitor.page.goto("/");
          return visitor.page.getByRole("heading", { name: "Skills" }).count();
        },
        { timeout: 5000 },
      )
      .toBe(0);
  } finally {
    await visitor.close();
  }
  await toggle("Hidden").click();
  await expect(toggle("Visible")).toBeVisible();
});

test("appearance: picking an accent updates the live swatch, and saves", async ({
  page,
  browser,
}) => {
  await loginAsAdmin(page);
  await page.goto("/admin/settings");
  const target = snapshot.accent === "rose" ? "teal" : "rose";
  await page.getByLabel(target[0].toUpperCase() + target.slice(1)).check();
  await expect(page.getByTestId("accent-preview")).toContainText(
    target[0].toUpperCase() + target.slice(1),
  );
  await page.getByRole("button", { name: "Save accent" }).click();
  await expect(page.getByText("Saved — live on your site")).toBeVisible();
  await expect
    .poll(() => publicAccent(browser), { timeout: 5000 })
    .toBe(target);
});

test("SEO: counters, invalid input saves nothing, valid input saves", async ({
  page,
}) => {
  await loginAsAdmin(page);
  await page.goto("/admin/settings");
  const description = page.getByLabel("SEO description");

  await description.fill("");
  await page.getByRole("button", { name: "Save SEO" }).click();
  await expect(page.getByText("Required").first()).toBeVisible();
  expect(await setting<string>("seo_description")).toBe(
    snapshot.seo_description,
  );

  const valid = `E2E-${Date.now()} description`;
  await description.fill(valid);
  await expect(page.getByText(`${valid.length}/160`)).toBeVisible();
  await page.getByRole("button", { name: "Save SEO" }).click();
  await expect(page.getByText("Saved — live on your site")).toBeVisible();
  await expect.poll(() => setting<string>("seo_description")).toBe(valid);
});

test("contact form toggle saves", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/settings");
  const toggle = page.getByRole("switch", { name: "Contact form" });
  const wasOn = snapshot.contact_form_enabled;
  await toggle.click();
  await expect
    .poll(() => setting<boolean>("contact_form_enabled"), { timeout: 5000 })
    .toBe(!wasOn);
});

test("log out of all devices needs a confirm and ends the session", async ({
  page,
}) => {
  await loginAsAdmin(page);
  await page.goto("/admin/settings");
  const version = await setting<number>("session_version");

  await page.getByRole("button", { name: "Log out of all devices" }).click();
  const confirm = page.getByRole("alertdialog");
  await confirm.getByRole("button", { name: "Cancel" }).click();
  expect(await setting<number>("session_version")).toBe(version);

  await page.getByRole("button", { name: "Log out of all devices" }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Log out everywhere" })
    .click();
  await expect(page).toHaveURL(/\/admin\/login/);
  expect(await setting<number>("session_version")).toBe(version + 1);
  // Other specs log in fresh, so the bumped version does not affect them.
});

test("page is axe clean and has no horizontal scroll at 375 px", async ({
  page,
}) => {
  await loginAsAdmin(page);
  await page.goto("/admin/settings");
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  const bad = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(bad, JSON.stringify(bad, null, 2)).toEqual([]);

  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/admin/settings");
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
