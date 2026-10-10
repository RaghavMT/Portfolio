import "server-only";
import { eq } from "drizzle-orm";
import { type ActionResult, failMessage, ok } from "@/lib/action-result";
import { unusedFiles } from "@/lib/upload-rules";
import { assertOwnBlobUrls, deleteBlobs } from "../blob";
import { runMutation } from "./run";
import { db } from "../db/client";
import { siteSettings } from "../db/schema";

/** The `site_settings` columns that hold a Blob file (SPEC §7.2). */
type BlobColumn = "avatarUrl" | "resumeUrl" | "ogImageUrl";

/**
 * Writes some columns of the `site_settings` singleton (id = 1). Callers pass values that already
 * went through one of the partial schemas, so only their own columns are ever set; `session_version`
 * is never in `values`. `updated_at` is set by the column hook.
 *
 * `blobColumns` names the file columns this save may change: their new URLs are re-checked against
 * this store (SPEC §10.1), and a file that was replaced or removed is deleted after the save
 * succeeded (§10.4).
 */
export function updateSiteSettings(
  action: string,
  values: Partial<typeof siteSettings.$inferInsert>,
  blobColumns: readonly BlobColumn[] = [],
): Promise<ActionResult<void>> {
  return runMutation(action, async () => {
    try {
      assertOwnBlobUrls(blobColumns.map((column) => values[column]));
    } catch {
      return failMessage("That file isn't valid. Upload it again.");
    }
    const [before] = blobColumns.length
      ? await db
          .select({
            avatarUrl: siteSettings.avatarUrl,
            resumeUrl: siteSettings.resumeUrl,
            ogImageUrl: siteSettings.ogImageUrl,
          })
          .from(siteSettings)
          .where(eq(siteSettings.id, 1))
      : [];
    const rows = await db
      .update(siteSettings)
      .set(values)
      .where(eq(siteSettings.id, 1))
      .returning({ id: siteSettings.id });
    if (!rows.length) return failMessage("Settings not found.");
    if (before) {
      const changed = blobColumns.filter((column) => column in values);
      await deleteBlobs(
        unusedFiles(
          changed.map((column) => before[column]),
          changed.map((column) => values[column]),
        ),
      );
    }
    return ok(undefined);
  });
}
