/**
 * Backup export rules (SPEC §9.11): which tables go in, what the file is called and which Blob files
 * it lists. Pure, so it is unit-tested; the database reads live in `src/server/admin/backup.ts`.
 */

/** Every table in schema.ts except `login_attempts`. A unit test fails if a table is added and forgotten. */
export const BACKUP_TABLES = [
  "site_settings",
  "social_links",
  "projects",
  "project_images",
  "experiences",
  "education",
  "skill_groups",
  "skills",
  "certifications",
  "messages",
] as const;

export type BackupTable = (typeof BACKUP_TABLES)[number];
export type BackupRow = Record<string, unknown>;

export type Backup = {
  exportedAt: string;
  tables: Record<BackupTable, BackupRow[]>;
  blobUrls: string[];
};

const IST_DATE = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Asia/Kolkata",
});

/** `portfolio-backup-YYYY-MM-DD.json`, dated in Asia/Kolkata like every admin timestamp (SPEC §14.2). */
export function backupFilename(now: Date = new Date()) {
  const get = Object.fromEntries(
    IST_DATE.formatToParts(now).map((p) => [p.type, p.value]),
  );
  return `portfolio-backup-${get.year}-${get.month}-${get.day}.json`;
}

type Tables = Partial<Record<string, readonly BackupRow[]>>;

/** Every uploaded file the content points at, de-duplicated, straight from the rows (no Blob API call). */
export function collectBlobUrls(tables: Tables): string[] {
  const urls = new Set<string>();
  const add = (rows: readonly BackupRow[] | undefined, keys: string[]) => {
    for (const row of rows ?? []) {
      for (const key of keys) {
        const value = row[key];
        if (typeof value === "string" && value) urls.add(value);
      }
    }
  };
  add(tables.site_settings, ["avatarUrl", "resumeUrl", "ogImageUrl"]);
  add(tables.projects, ["coverImageUrl"]);
  add(tables.project_images, ["url"]);
  return [...urls];
}

/**
 * The file's content: all rows of every content table, the export time and the Blob URLs. The session
 * version is dropped from `site_settings`: it is a login control, not content, and a restored value
 * could silently log people out or keep old sessions alive.
 */
export function buildBackup(
  tables: Record<BackupTable, readonly BackupRow[]>,
  now: Date = new Date(),
): Backup {
  const out = {} as Record<BackupTable, BackupRow[]>;
  for (const name of BACKUP_TABLES) {
    out[name] = tables[name].map((row) => ({ ...row }));
  }
  out.site_settings = out.site_settings.map((row) => {
    const { sessionVersion, ...rest } = row;
    void sessionVersion;
    return rest;
  });
  return {
    exportedAt: now.toISOString(),
    tables: out,
    blobUrls: collectBlobUrls(out),
  };
}
