"use server";

import { eq, sql } from "drizzle-orm";
import { logAction } from "@/lib/logger";
import { db } from "../../db/client";
import { siteSettings } from "../../db/schema";
import { requireAdmin } from "../../auth/require-admin";

/** "Log out of all devices" (SPEC §12.1): bumping the version invalidates every issued token. */
export async function logoutAllDevices(): Promise<{ ok: true }> {
  await requireAdmin();
  const startedAt = Date.now();
  await db
    .update(siteSettings)
    .set({ sessionVersion: sql`${siteSettings.sessionVersion} + 1` })
    .where(eq(siteSettings.id, 1));
  logAction({ action: "logoutAllDevices", ok: true, startedAt });
  return { ok: true };
}
