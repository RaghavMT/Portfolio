import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { loginAsAdmin, sql } from "./helpers";

// FR-PUB-07 / FR-ADM-07 / SPEC §16.2 #6 against the TEST database. Every row is named "E2E-…" and
// removed before and after. Visitors use their own client IPs (x-forwarded-for, like auth.spec.ts)
// so the per-IP limit of one test never touches another's.
test.describe.configure({ mode: "serial" });
test.skip(({ isMobile }) => isMobile, "admin flows are viewport-independent");

const stamp = Date.now();
const SUCCESS = "Thanks — I'll reply within 2 working days.";

async function clean() {
  await sql`delete from messages where name like 'E2E-%'`;
}
test.beforeAll(clean);
test.afterAll(clean);

type Fields = {
  name: string;
  email?: string;
  subject?: string;
  company?: string;
  body?: string;
};

async function visitor(browser: Browser, ip: string) {
  const context = await browser.newContext({
    extraHTTPHeaders: { "x-forwarded-for": ip },
  });
  return { page: await context.newPage(), close: () => context.close() };
}

/**
 * Fills and sends the public form. The render stamp is set directly so a test doesn't wait 3 s
 * (`ageMs`); the real 3 s timing is covered by its own test.
 */
async function send(
  page: Page,
  fields: Fields,
  options: { ageMs?: number; website?: string } = {},
) {
  await page.goto("/");
  // The stamp is set in the browser after hydration, so a value means the form is live.
  await expect(page.locator('input[name="renderedAt"]')).not.toHaveValue("");
  await page.locator("#contact-name").fill(fields.name);
  await page.locator("#contact-email").fill(fields.email ?? "ada@example.test");
  await page.locator("#contact-company").fill(fields.company ?? "");
  await page.locator("#contact-subject").fill(fields.subject ?? "");
  await page
    .locator("#contact-body")
    .fill(fields.body ?? "I would like to talk about a role.");
  await page.evaluate(
    ([age, website]) => {
      const form = document.querySelector("#contact form") as HTMLFormElement;
      (form.elements.namedItem("renderedAt") as HTMLInputElement).value =
        String(Date.now() - age);
      (form.elements.namedItem("website") as HTMLInputElement).value = website;
    },
    [options.ageMs ?? 10_000, options.website ?? ""] as const,
  );
  await page.getByRole("button", { name: "Send message" }).click();
}

const rowsNamed = async (prefix: string) =>
  (
    await sql`select count(*)::int as n from messages where name like ${prefix + "%"}`
  )[0].n as number;

test("a visitor's message reaches the inbox: read, unread, archive, delete", async ({
  page,
  browser,
}) => {
  const name = `E2E-${stamp} Ada`;
  const v = await visitor(browser, "203.0.113.61");
  try {
    await send(v.page, {
      name,
      subject: `E2E-${stamp} subject`,
      company: "Analytical Engines",
    });
    await expect(v.page.getByRole("status")).toHaveText(SUCCESS);
  } finally {
    await v.close();
  }

  const [row] = await sql`
    select id, ip_hash, read_at, archived, company from messages where name = ${name}`;
  expect(row).toBeTruthy();
  expect(row.ip_hash).toMatch(/^[0-9a-f]{64}$/);
  expect(row.ip_hash).not.toContain("203.0.113");
  expect(row.read_at).toBeNull();
  expect(row.company).toBe("Analytical Engines");

  await loginAsAdmin(page);
  const badge = page.getByTestId("unread-badge").filter({ visible: true });
  const unreadNow = async () =>
    (
      await sql`select count(*)::int as n from messages where read_at is null and not archived`
    )[0].n as number;
  await expect(badge).toHaveText(new RegExp(`^${await unreadNow()}\\s*unread`));

  await page.goto("/admin/messages");
  await expect(page.getByText(name)).toBeVisible();
  await expect(page.getByText("Unread", { exact: true }).first()).toBeVisible();

  // open → marked read, full text shown, badge count drops
  await page.getByRole("button", { name: new RegExp(name) }).click();
  const sheet = page.getByRole("dialog");
  await expect(
    sheet.getByText("I would like to talk about a role."),
  ).toBeVisible();
  await expect(sheet.getByRole("link", { name: "Reply" })).toHaveAttribute(
    "href",
    /^mailto:ada@example\.test\?subject=Re%3A%20E2E-/,
  );
  await expect
    .poll(
      async () =>
        (await sql`select read_at from messages where id = ${row.id}`)[0]
          .read_at,
    )
    .not.toBeNull();

  // mark unread
  await sheet.getByRole("button", { name: "Mark unread" }).click();
  await expect
    .poll(
      async () =>
        (await sql`select read_at from messages where id = ${row.id}`)[0]
          .read_at,
    )
    .toBeNull();

  // archive: leaves the inbox, shows under Archived
  await page.getByRole("button", { name: new RegExp(name) }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Archive" })
    .click();
  await expect
    .poll(
      async () =>
        (await sql`select archived from messages where id = ${row.id}`)[0]
          .archived,
    )
    .toBe(true);
  await expect(
    page.getByRole("button", { name: new RegExp(name) }),
  ).toHaveCount(0);
  await page.getByRole("tab", { name: "Archived" }).click();
  await expect(
    page.getByRole("button", { name: new RegExp(name) }),
  ).toBeVisible();

  // delete needs a confirm; cancel keeps it
  await page.getByRole("button", { name: new RegExp(name) }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete" })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Cancel" })
    .click();
  expect(await rowsNamed(name)).toBe(1);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete" })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete" })
    .click();
  await expect.poll(() => rowsNamed(name)).toBe(0);
});

test("a message sent after the real 3 s wait is stored", async ({
  browser,
}) => {
  const name = `E2E-${stamp} slow`;
  const v = await visitor(browser, "203.0.113.62");
  try {
    await v.page.goto("/");
    await expect(v.page.locator('input[name="renderedAt"]')).not.toHaveValue(
      "",
    );
    await v.page.waitForTimeout(3200);
    await v.page.locator("#contact-name").fill(name);
    await v.page.locator("#contact-email").fill("ada@example.test");
    await v.page.locator("#contact-body").fill("Sent after a proper pause.");
    await v.page.getByRole("button", { name: "Send message" }).click();
    await expect(v.page.getByRole("status")).toHaveText(SUCCESS);
    expect(await rowsNamed(name)).toBe(1);
  } finally {
    await v.close();
  }
});

test("the 4th message within an hour from one IP is refused", async ({
  browser,
}) => {
  const prefix = `E2E-${stamp}-rl`;
  const [{ contact_email }] =
    await sql`select contact_email from site_settings where id = 1`;
  const v = await visitor(browser, "203.0.113.63");
  try {
    for (let i = 1; i <= 3; i++) {
      await send(v.page, { name: `${prefix}${i}` });
      await expect(v.page.getByRole("status")).toHaveText(SUCCESS);
    }
    await send(v.page, { name: `${prefix}4` });
    await expect(
      v.page.getByRole("alert").filter({ hasText: "Too many messages" }),
    ).toContainText(`email me directly at ${contact_email}`);
    expect(await rowsNamed(prefix)).toBe(3);
    // the visitor's text is still in the form
    await expect(v.page.locator("#contact-name")).toHaveValue(`${prefix}4`);
  } finally {
    await v.close();
  }
});

test("honeypot and too-fast submissions look successful but store nothing", async ({
  browser,
}) => {
  const v = await visitor(browser, "203.0.113.64");
  try {
    const bot = `E2E-${stamp} honeypot`;
    await send(v.page, { name: bot }, { website: "http://spam.test" });
    await expect(v.page.getByRole("status")).toHaveText(SUCCESS);
    expect(await rowsNamed(bot)).toBe(0);

    const fast = `E2E-${stamp} fast`;
    await send(v.page, { name: fast }, { ageMs: 500 });
    await expect(v.page.getByRole("status")).toHaveText(SUCCESS);
    expect(await rowsNamed(fast)).toBe(0);
  } finally {
    await v.close();
  }
});

test("invalid input shows inline errors, keeps the text and stores nothing", async ({
  browser,
}) => {
  const name = `E2E-${stamp} invalid`;
  const v = await visitor(browser, "203.0.113.65");
  try {
    await send(v.page, { name, email: "not-an-email", body: "short" });
    await expect(v.page.locator("#contact-email-error")).toBeVisible();
    await expect(v.page.locator("#contact-body-error")).toBeVisible();
    await expect(v.page.locator("#contact-name")).toHaveValue(name);
    await expect(v.page.locator("#contact-email")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(await rowsNamed(name)).toBe(0);
  } finally {
    await v.close();
  }
});

test("contact form and inbox are axe clean with no horizontal scroll at 375 px", async ({
  page,
  browser,
}) => {
  const name = `E2E-${stamp} axe`;
  await sql`insert into messages (name, email, body, ip_hash)
            values (${name}, 'ada@example.test', 'A message for the accessibility check.', ${"a".repeat(64)})`;

  const serious = (r: Awaited<ReturnType<AxeBuilder["analyze"]>>) =>
    r.violations.filter(
      (x) => x.impact === "serious" || x.impact === "critical",
    );
  const overflow = (p: Page) =>
    p.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );

  const v = await visitor(browser, "203.0.113.66");
  try {
    await v.page.goto("/");
    await expect(v.page.locator("#contact-name")).toBeVisible();
    expect(serious(await new AxeBuilder({ page: v.page }).analyze())).toEqual(
      [],
    );
    await v.page.setViewportSize({ width: 375, height: 800 });
    await v.page.goto("/");
    expect(await overflow(v.page)).toBeLessThanOrEqual(0);
  } finally {
    await v.close();
  }

  await loginAsAdmin(page);
  await page.goto("/admin/messages");
  await expect(page.getByText(name)).toBeVisible();
  expect(serious(await new AxeBuilder({ page }).analyze())).toEqual([]);
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/admin/messages");
  await expect(page.getByText(name)).toBeVisible();
  expect(await overflow(page)).toBeLessThanOrEqual(0);
});
