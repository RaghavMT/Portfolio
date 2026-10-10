"use server";

import { backupFilename } from "@/lib/admin/backup";
import { failMessage, ok, type ActionResult } from "@/lib/action-result";
import { logAction } from "@/lib/logger";
import { requireAdmin } from "../../auth/require-admin";
import { readBackup } from "../../admin/backup";

/**
 * "Download backup" (SPEC §9.11): the whole site as one JSON text plus the file name to save it under.
 * Read-only, so nothing is invalidated (like the inbox actions, D37). It is a Server Action rather than
 * a GET route so the built-in Origin check applies (SEC-07); the browser turns the text into a file.
 */
export async function exportBackup(): Promise<
  ActionResult<{ filename: string; json: string }>
> {
  await requireAdmin();
  const startedAt = Date.now();
  try {
    const now = new Date();
    const backup = await readBackup(now);
    logAction({ action: "exportBackup", ok: true, startedAt });
    return ok({
      filename: backupFilename(now),
      json: JSON.stringify(backup, null, 2),
    });
  } catch {
    logAction({
      action: "exportBackup",
      ok: false,
      startedAt,
      code: "db_error",
    });
    return failMessage("Couldn't create the backup. Please try again.");
  }
}
