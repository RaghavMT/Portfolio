import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { loginAsAdmin, sql } from "./helpers";

// FR-ADM-10: Settings → Download backup gives portfolio-backup-YYYY-MM-DD.json with every content
// table, no login_attempts and no session version. Other admin specs add and delete "E2E-" rows at
// the same time, so row COUNTS are not compared: only stable seeded rows are looked up by id.
test.skip(({ isMobile }) => isMobile, "admin flows are viewport-independent");

const CONTENT_TABLES = [
  "certifications",
  "education",
  "experiences",
  "messages",
  "project_images",
  "projects",
  "site_settings",
  "skill_groups",
  "skills",
  "social_links",
];

test("download has every content table and nothing private to logins", async ({
  page,
}) => {
  await loginAsAdmin(page);
  await page.goto("/admin/settings");

  const [seeded] = await sql`
    select id from projects where title not like 'E2E-%' order by created_at limit 1`;
  expect(seeded, "the test DB needs one seeded project").toBeDefined();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download backup" }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(
    /^portfolio-backup-\d{4}-\d{2}-\d{2}\.json$/,
  );

  const backup = JSON.parse(await readFile((await download.path())!, "utf8"));
  expect(Object.keys(backup).sort()).toEqual([
    "blobUrls",
    "exportedAt",
    "tables",
  ]);
  expect(Number.isNaN(Date.parse(backup.exportedAt))).toBe(false);

  // every content table, as an array; never the login attempts
  expect(Object.keys(backup.tables).sort()).toEqual(CONTENT_TABLES);
  expect(backup.tables).not.toHaveProperty("login_attempts");
  for (const name of CONTENT_TABLES) {
    expect(Array.isArray(backup.tables[name]), name).toBe(true);
  }

  // the settings singleton is there, without the session version
  expect(backup.tables.site_settings).toHaveLength(1);
  expect(backup.tables.site_settings[0]).toHaveProperty("fullName");
  expect(backup.tables.site_settings[0]).not.toHaveProperty("sessionVersion");
  expect(JSON.stringify(backup)).not.toMatch(/session_?version/i);

  // a real row from the database is in the file, with its full content
  const projectIds = backup.tables.projects.map((p: { id: string }) => p.id);
  expect(projectIds).toContain(seeded.id);
  expect(backup.tables.projects[0]).toHaveProperty("problemMd");

  expect(Array.isArray(backup.blobUrls)).toBe(true);
  await expect(page.getByText(/Saved portfolio-backup-/)).toBeVisible();
});

test("settings page explains the file is private", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/settings");
  await expect(page.getByRole("heading", { name: "Backup" })).toBeVisible();
  await expect(page.getByText(/keep it private/i)).toBeVisible();
});
