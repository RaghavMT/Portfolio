"use server";

import { fail } from "@/lib/action-result";
import { profileSchema, resumeSchema } from "@/lib/validation/site-settings";
import { requireAdmin } from "../../auth/require-admin";
import { updateSiteSettings } from "../../admin/settings";

/** Profile text + avatar (SPEC §9.4). The résumé is saved separately by `updateResume`. */
export async function updateProfile(input: unknown) {
  await requireAdmin();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error);
  // No avatar means no alt text either, so a removed photo never leaves stale alt text behind.
  return updateSiteSettings(
    "updateProfile",
    parsed.data.avatarUrl
      ? parsed.data
      : { ...parsed.data, avatarUrl: null, avatarAlt: null },
    ["avatarUrl"],
  );
}

/** Replace or remove the résumé PDF (SPEC §9.4). `resume_updated_at` moves only when the file changes. */
export async function updateResume(input: unknown) {
  await requireAdmin();
  const parsed = resumeSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error);
  return updateSiteSettings(
    "updateResume",
    {
      resumeUrl: parsed.data.resumeUrl,
      resumeUpdatedAt: parsed.data.resumeUrl ? new Date() : null,
    },
    ["resumeUrl"],
  );
}
