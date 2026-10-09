import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Runs against the seeded TEST database (see playwright.config.ts). Seed: 2 published projects
// (todo-project-one featured), 1 draft (todo-draft-project), no resume, no images.

test.describe("visitor smoke (SPEC §16.2 #1)", () => {
  test("home renders the hero and every section in order", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Raghav Tibra",
    );
    const headings = await page
      .getByRole("heading", { level: 2 })
      .allTextContents();
    expect(headings).toEqual([
      "About",
      "Projects",
      "Experience",
      "Skills",
      "Education",
      "Certifications & awards",
      "Get in touch",
    ]);
    await expect(page.getByText("TODO: Draft project")).toHaveCount(0);
    await expect(page.getByRole("contentinfo")).toContainText("Last updated");
  });

  test("a project card opens its case study", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "TODO: Project one" }).click();
    await expect(page).toHaveURL(/\/projects\/todo-project-one$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "TODO: Project one",
    );
    for (const name of ["Problem", "Approach", "Outcome"]) {
      await expect(page.getByRole("heading", { name })).toBeVisible();
    }
    await page.getByRole("link", { name: "All projects" }).click();
    await expect(page).toHaveURL(/\/projects$/);
  });

  test("/resume is a 404 with a contact link when no resume is set", async ({
    request,
  }) => {
    const res = await request.get("/resume", { maxRedirects: 0 });
    expect(res.status()).toBe(404);
    expect(await res.text()).toContain("mailto:");
  });

  test("draft and unknown project slugs are not served", async ({
    page,
    request,
  }) => {
    for (const slug of ["todo-draft-project", "no-such-project"]) {
      await page.goto(`/projects/${slug}`);
      await expect(
        page.getByRole("heading", { name: "Page not found" }),
      ).toBeVisible();
      await expect(page.getByText("TODO: Draft project")).toHaveCount(0);
      // Next may inject the tag twice (shell + stream); both say noindex.
      await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute(
        "content",
        /noindex/,
      );
      // D19: the very first request streams with 200 (+ noindex); the cached page is a real 404.
      await expect
        .poll(async () => (await request.get(`/projects/${slug}`)).status(), {
          timeout: 20_000,
        })
        .toBe(404);
    }
  });

  test("tag filter works as plain links", async ({ page }) => {
    await page.goto("/projects?tag=todo");
    await expect(
      page.getByRole("link", { name: /TODO: Project (one|two)/ }),
    ).toHaveCount(2);
    await expect(
      page.getByRole("link", { name: "TODO", exact: true }),
    ).toHaveAttribute("aria-current", "true");
    await page.goto("/projects?tag=nope");
    await expect(page.getByText("No projects match that tag.")).toBeVisible();
  });

  test("theme toggle switches and is remembered", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    const html = page.locator("html");
    await expect(html).not.toHaveClass(/dark/);
    await page.getByRole("button", { name: "Toggle dark mode" }).click();
    await expect(html).toHaveClass(/dark/);
    await page.reload();
    await expect(html).toHaveClass(/dark/);
  });

  test("name, headline and the primary CTA are above the fold on a phone", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    for (const locator of [
      page.getByRole("heading", { level: 1 }),
      page.getByText("Software Engineer", { exact: true }).first(),
      page.getByRole("link", { name: "View projects" }),
    ]) {
      await expect(locator).toBeInViewport({ ratio: 1 });
    }
    // No horizontal scroll at 375 px.
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe("accessibility (axe, WCAG 2.2 AA)", () => {
  const paths = ["/", "/projects", "/projects/todo-project-one"];
  for (const colorScheme of ["light", "dark"] as const) {
    for (const path of paths) {
      test(`${path} has no serious/critical issues (${colorScheme})`, async ({
        page,
      }) => {
        await page.emulateMedia({ colorScheme });
        await page.goto(path);
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
          .analyze();
        const blocking = results.violations.filter(
          (v) => v.impact === "serious" || v.impact === "critical",
        );
        expect(
          blocking.map((v) => `${v.id}: ${v.nodes.length} node(s)`),
        ).toEqual([]);
      });
    }
  }
});
