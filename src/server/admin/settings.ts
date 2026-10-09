import "server-only";
import { eq } from "drizzle-orm";
import { type ActionResult, failMessage, ok } from "@/lib/action-result";
import { runMutation } from "./run";
import { db } from "../db/client";
import { siteSettings } from "../db/schema";

/**
 * Writes some columns of the `site_settings` singleton (id = 1). Callers pass values that already
 * went through one of the partial schemas, so only their own columns are ever set; `session_version`,
 * resume_*, avatar_* and og_image_url are never in `values`. `updated_at` is set by the column hook.
 */
export function updateSiteSettings(
  action: string,
  values: Partial<typeof siteSettings.$inferInsert>,
): Promise<ActionResult<void>> {
  return runMutation(action, async () => {
    const rows = await db
      .update(siteSettings)
      .set(values)
      .where(eq(siteSettings.id, 1))
      .returning({ id: siteSettings.id });
    return rows.length ? ok(undefined) : failMessage("Settings not found.");
  });
}
