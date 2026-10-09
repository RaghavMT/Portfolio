"use server";

import { eq, sql } from "drizzle-orm";
import { fail } from "@/lib/action-result";
import { logAction } from "@/lib/logger";
import {
  appearanceSchema,
  contactFormSchema,
  sectionsSchema,
  seoSchema,
} from "@/lib/validation/site-settings";
import { db } from "../../db/client";
import { siteSettings } from "../../db/schema";
import { requireAdmin } from "../../auth/require-admin";
import { updateSiteSettings } from "../../admin/settings";

/** Home-page section order + visibility (SPEC §7.3, §9.9). */
export async function updateSections(input: unknown) {
  await requireAdmin();
  const parsed = sectionsSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error);
  return updateSiteSettings("updateSections", { sections: parsed.data });
}

export async function updateAppearance(input: unknown) {
  await requireAdmin();
  const parsed = appearanceSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error);
  return updateSiteSettings("updateAppearance", parsed.data);
}

/** SEO title + description; the OG image arrives with uploads (Phase 5). */
export async function updateSeo(input: unknown) {
  await requireAdmin();
  const parsed = seoSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error);
  return updateSiteSettings("updateSeo", parsed.data);
}

export async function setContactForm(input: unknown) {
  await requireAdmin();
  const parsed = contactFormSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error);
  return updateSiteSettings("setContactForm", parsed.data);
}

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
