import { getTableName, is } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import {
  BACKUP_TABLES,
  backupFilename,
  buildBackup,
  collectBlobUrls,
  type BackupRow,
  type BackupTable,
} from "@/lib/admin/backup";
import * as schema from "../../../src/server/db/schema";

const emptyTables = () =>
  Object.fromEntries(
    BACKUP_TABLES.map((name) => [name, [] as BackupRow[]]),
  ) as Record<BackupTable, BackupRow[]>;

describe("BACKUP_TABLES (SPEC §9.11)", () => {
  it("is every table in schema.ts except login_attempts", () => {
    // schema.ts also exports enums and row types; keep only the real tables
    const all = Object.values(schema as Record<string, unknown>).flatMap((v) =>
      is(v, PgTable) ? [getTableName(v)] : [],
    );
    expect(all).toContain("login_attempts");
    expect([...BACKUP_TABLES].sort()).toEqual(
      all.filter((n) => n !== "login_attempts").sort(),
    );
  });

  it("has no duplicates", () => {
    expect(new Set(BACKUP_TABLES).size).toBe(BACKUP_TABLES.length);
  });
});

describe("backupFilename", () => {
  it("is portfolio-backup-YYYY-MM-DD.json", () => {
    expect(backupFilename(new Date("2026-10-10T08:00:00Z"))).toBe(
      "portfolio-backup-2026-10-10.json",
    );
  });

  it("uses the Asia/Kolkata date, not the UTC one", () => {
    // 20:00 UTC on the 10th is 01:30 on the 11th in India.
    expect(backupFilename(new Date("2026-10-10T20:00:00Z"))).toBe(
      "portfolio-backup-2026-10-11.json",
    );
    // 18:29 UTC is still the 10th (23:59 IST); 18:30 UTC is the 11th (00:00 IST).
    expect(backupFilename(new Date("2026-10-10T18:29:00Z"))).toBe(
      "portfolio-backup-2026-10-10.json",
    );
    expect(backupFilename(new Date("2026-10-10T18:30:00Z"))).toBe(
      "portfolio-backup-2026-10-11.json",
    );
  });
});

describe("collectBlobUrls", () => {
  const a = "https://s.public.blob.vercel-storage.com/images/a-x.png";
  const b = "https://s.public.blob.vercel-storage.com/images/b-x.png";
  const r = "https://s.public.blob.vercel-storage.com/resume/r-x.pdf";

  it("collects avatar, resume, share image, covers and gallery, once each", () => {
    expect(
      collectBlobUrls({
        site_settings: [{ avatarUrl: a, resumeUrl: r, ogImageUrl: null }],
        projects: [{ coverImageUrl: b }, { coverImageUrl: a }],
        project_images: [{ url: b }, { url: a }],
      }).sort(),
    ).toEqual([a, b, r].sort());
  });

  it("drops nulls and empty strings and copes with no rows", () => {
    expect(
      collectBlobUrls({
        site_settings: [{ avatarUrl: null, resumeUrl: "", ogImageUrl: null }],
        projects: [{ coverImageUrl: null }],
        project_images: [],
      }),
    ).toEqual([]);
    expect(collectBlobUrls({})).toEqual([]);
  });
});

describe("buildBackup", () => {
  const now = new Date("2026-10-10T08:00:00Z");

  it("has exactly the content tables, the export time and the blob URLs", () => {
    const backup = buildBackup(emptyTables(), now);
    expect(Object.keys(backup).sort()).toEqual([
      "blobUrls",
      "exportedAt",
      "tables",
    ]);
    expect(backup.exportedAt).toBe("2026-10-10T08:00:00.000Z");
    expect(Object.keys(backup.tables).sort()).toEqual(
      [...BACKUP_TABLES].sort(),
    );
    expect(backup.tables).not.toHaveProperty("login_attempts");
  });

  it("keeps full rows but never the session version", () => {
    const tables = emptyTables();
    tables.site_settings = [
      { id: 1, fullName: "Raghav", sessionVersion: 7, accent: "indigo" },
    ];
    tables.projects = [{ id: "p1", title: "T", sessionVersion: "keep-me" }];
    const { tables: out } = buildBackup(tables, now);
    expect(out.site_settings).toEqual([
      { id: 1, fullName: "Raghav", accent: "indigo" },
    ]);
    // only site_settings is touched
    expect(out.projects).toEqual([
      { id: "p1", title: "T", sessionVersion: "keep-me" },
    ]);
  });

  it("does not mutate its input", () => {
    const tables = emptyTables();
    tables.site_settings = [{ id: 1, sessionVersion: 3 }];
    buildBackup(tables, now);
    expect(tables.site_settings).toEqual([{ id: 1, sessionVersion: 3 }]);
  });

  it("lists blob URLs from the rows it was given", () => {
    const url = "https://s.public.blob.vercel-storage.com/images/c-x.png";
    const tables = emptyTables();
    tables.projects = [{ coverImageUrl: url }];
    expect(buildBackup(tables, now).blobUrls).toEqual([url]);
  });

  it("serialises dates to ISO strings", () => {
    const tables = emptyTables();
    tables.messages = [
      { id: "m", createdAt: new Date("2026-01-02T03:04:05Z") },
    ];
    const parsed = JSON.parse(JSON.stringify(buildBackup(tables, now)));
    expect(parsed.tables.messages[0].createdAt).toBe(
      "2026-01-02T03:04:05.000Z",
    );
  });
});
