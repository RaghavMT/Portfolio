import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { loginAsAdmin, sql, visitorPage } from "./helpers";

// FR-ADM-04 / FR-ADM-11 against the TEST database: the full project lifecycle
// (create draft → not public → publish → feature → edit → unpublish → duplicate → delete), the
// publish rule, slug uniqueness, and the list's filters. Every row is prefixed "E2E-" (or
// "Copy of E2E-") and removed afterwards, so the seeded test DB is left unchanged.
test.describe.configure({ mode: "serial" });
test.skip(({ isMobile }) => isMobile, "admin flows are viewport-independent");

const stamp = Date.now();
const TITLE = `E2E-${stamp} Project`;
const SLUG = `e2e-${stamp}-project`;
const COPY_TITLE = `Copy of ${TITLE}`;
const COPY_SLUG = `copy-of-e2e-${stamp}-project`;

async function cleanup() {
  await sql`delete from projects where title like 'E2E-%' or title like 'Copy of E2E-%'`;
}
test.beforeAll(cleanup);
test.afterAll(cleanup);

async function projectRow(slug: string) {
  const rows = await sql`
    select id, status, featured, summary, published_at, slug, title
    from projects where slug = ${slug}`;
  return rows[0] as
    | {
        id: string;
        status: string;
        featured: boolean;
        summary: string;
        published_at: string | null;
        slug: string;
        title: string;
      }
    | undefined;
}

async function projectCount() {
  const rows = await sql`select count(*)::int as n from projects`;
  return rows[0].n as number;
}

/** Polls what a logged-out visitor sees on `path` for up to 5 s (the AC window). */
async function expectPublic(
  browser: Browser,
  path: string,
  text: string,
  visible: boolean,
) {
  const visitor = await visitorPage(browser);
  try {
    await expect
      .poll(
        async () => {
          await visitor.page.goto(path);
          return visitor.page.getByText(text).count();
        },
        { timeout: 5000 },
      )
      [visible ? "toBeGreaterThan" : "toBe"](0);
  } finally {
    await visitor.close();
  }
}

async function fillBasics(page: Page, title: string, summary: string) {
  await page.locator("#pj-title").fill(title);
  await page.getByLabel("Summary").fill(summary);
}

test("invalid input shows inline errors and saves nothing", async ({
  page,
}) => {
  await loginAsAdmin(page);
  await page.goto("/admin/projects/new");
  const before = await projectCount();

  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("Required").first()).toBeVisible();
  expect(await projectCount()).toBe(before);
});

test("publish rule: a summary and at least one technology", async ({
  page,
}) => {
  await loginAsAdmin(page);
  await page.goto("/admin/projects/new");
  const before = await projectCount();

  await fillBasics(page, `E2E-${stamp} rule`, "Has a summary but no tech");
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(
    page.getByText("Add at least one technology before publishing.").first(),
  ).toBeVisible();
  expect(await projectCount()).toBe(before);
});

test("lifecycle: draft → publish → feature → edit → unpublish → duplicate → delete", async ({
  page,
  browser,
}) => {
  // ~20 round trips to a remote database: the default 30 s is too tight.
  test.setTimeout(90_000);
  await loginAsAdmin(page);
  await page.goto("/admin/projects/new");

  // create a draft; the slug follows the title
  await fillBasics(page, TITLE, "First summary");
  await expect(page.getByLabel("Slug")).toHaveValue(SLUG);
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("Saved — live on your site")).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/projects\/[0-9a-f-]{36}$/);
  let row = await projectRow(SLUG);
  expect(row).toMatchObject({ status: "draft", featured: false });
  expect(row?.published_at).toBeNull();

  // a draft is not public: not on the list, and its page shows no project content
  await expectPublic(browser, "/projects", TITLE, false);
  await expectPublic(browser, `/projects/${SLUG}`, "First summary", false);

  // slug uniqueness is checked on blur: a second project can't take the same slug
  await page.goto("/admin/projects/new");
  const before = await projectCount();
  await fillBasics(page, `E2E-${stamp} other`, "Other");
  await page.getByLabel("Slug").fill(SLUG);
  await page.getByLabel("Summary").click();
  await expect(
    page.getByText("Another project already uses that slug."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(
    page.getByText("Another project already uses that slug.").first(),
  ).toBeVisible();
  expect(await projectCount()).toBe(before);

  // publish from the edit form: add a tech tag first
  await page.goto(`/admin/projects/${row!.id}`);
  await page.locator("#pj-tech").fill("TypeScript");
  await page.locator("#pj-tech").press("Enter");
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText("Saved — live on your site")).toBeVisible();
  await expectPublic(browser, `/projects/${SLUG}`, "First summary", true);
  await expectPublic(browser, "/projects", TITLE, true);
  row = await projectRow(SLUG);
  expect(row?.status).toBe("published");
  expect(row?.published_at).not.toBeNull();
  const firstPublishedAt = row!.published_at;

  // feature it from the list; it shows on the home page
  await page.goto("/admin/projects");
  await page
    .getByRole("button", { name: new RegExp(`^${TITLE}: Not featured`) })
    .click();
  await expect
    .poll(async () => (await projectRow(SLUG))?.featured, { timeout: 5000 })
    .toBe(true);
  await expectPublic(browser, "/", TITLE, true);

  // edit: change the summary; the live page follows, published_at is unchanged
  await page.getByRole("link", { name: `Edit ${TITLE}` }).click();
  await page.getByLabel("Summary").fill("Edited summary");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Saved — live on your site")).toBeVisible();
  await expectPublic(browser, `/projects/${SLUG}`, "Edited summary", true);
  expect((await projectRow(SLUG))?.published_at).toEqual(firstPublishedAt);

  // list controls: search and the Drafts filter
  await page.goto("/admin/projects");
  await page.getByLabel("Search projects by title").fill(`E2E-${stamp}`);
  await expect(
    page.getByRole("link", { name: TITLE, exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Drafts" }).click();
  await expect(page.getByText("No projects match.")).toBeVisible();
  await page.getByRole("button", { name: "Published" }).click();
  await expect(
    page.getByRole("link", { name: TITLE, exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "All" }).click();

  // unpublish from the list: gone from the public site, no longer featured
  await page
    .getByRole("button", { name: new RegExp(`^${TITLE}: Published`) })
    .click();
  await expect
    .poll(async () => (await projectRow(SLUG))?.status, { timeout: 5000 })
    .toBe("draft");
  expect((await projectRow(SLUG))?.featured).toBe(false);
  await expectPublic(browser, "/projects", TITLE, false);

  // duplicate: "Copy of …", draft, unique slug, not featured
  await page.getByRole("button", { name: `Duplicate ${TITLE}` }).click();
  await expect(page).toHaveURL(/\/admin\/projects\/[0-9a-f-]{36}$/);
  await expect(page.locator("#pj-title")).toHaveValue(COPY_TITLE);
  expect(await projectRow(COPY_SLUG)).toMatchObject({
    status: "draft",
    featured: false,
    title: COPY_TITLE,
  });

  // reorder: move the copy up on the list
  await page.goto("/admin/projects");
  await page.getByLabel("Search projects by title").fill("");
  await page
    .getByRole("button", { name: `Move project ${COPY_TITLE} up`, exact: true })
    .click();
  await expect(page.getByText("Order saved — live on your site")).toBeVisible();

  // delete needs the exact title typed
  await page.getByRole("button", { name: `Delete ${COPY_TITLE}` }).click();
  const confirm = page.getByRole("alertdialog");
  const confirmButton = confirm.getByRole("button", { name: "Delete" });
  await expect(confirmButton).toBeDisabled();
  await confirm.getByLabel(/Type/).fill(COPY_TITLE);
  await confirmButton.click();
  await expect(page.getByText("Deleted — gone from your site")).toBeVisible();
  await expect
    .poll(() => projectRow(COPY_SLUG), { timeout: 5000 })
    .toBeUndefined();

  await page.getByRole("button", { name: `Delete ${TITLE}` }).click();
  await page.getByRole("alertdialog").getByLabel(/Type/).fill(TITLE);
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete" })
    .click();
  // The earlier toast may still be on screen, so check the database rather than the toast.
  await expect.poll(() => projectRow(SLUG), { timeout: 5000 }).toBeUndefined();
  await expectPublic(browser, "/projects", TITLE, false);
});

test("pages are axe clean and have no horizontal scroll at 375 px", async ({
  page,
}) => {
  await loginAsAdmin(page);
  for (const path of ["/admin/projects", "/admin/projects/new"]) {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    const bad = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(bad, `${path}: ${JSON.stringify(bad, null, 2)}`).toEqual([]);

    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(path);
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});
