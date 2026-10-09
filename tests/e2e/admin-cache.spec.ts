import { expect, test } from "@playwright/test";
import { loginAsAdmin, sql, visitorPage } from "./helpers";

// FR-ADM-11: the first public requests AFTER an admin mutation (cache tag expired) must still serve
// complete pages. Phase 2 never invalidated the cache, so this is the first time it is exercised.
test.describe.configure({ mode: "serial" });
test.skip(({ isMobile }) => isMobile, "admin flows are viewport-independent");

test("public pages render fully right after an admin mutation", async ({
  page,
  browser,
}) => {
  await loginAsAdmin(page);
  await page.goto("/admin/social");

  const [link] =
    await sql`select id from social_links order by sort_order limit 1`;
  const toggle = page.getByRole("button", { name: /: Visible/ }).first();
  await toggle.click();
  await expect(
    page.getByRole("button", { name: /: Hidden/ }).first(),
  ).toBeVisible();

  const visitor = await visitorPage(browser);
  try {
    for (const path of ["/projects/todo-project-one", "/projects", "/"]) {
      const response = await visitor.page.goto(path);
      expect(response?.status(), path).toBe(200);
      await expect(visitor.page, path).toHaveTitle(/\S/);
      await expect(visitor.page.locator("html"), path).toHaveAttribute(
        "lang",
        /\w/,
      );
      await expect(
        visitor.page.getByRole("heading", { level: 1 }),
        path,
      ).toBeVisible();
    }
  } finally {
    await visitor.close();
    await sql`update social_links set visible = true where id = ${link.id}`;
  }
});
