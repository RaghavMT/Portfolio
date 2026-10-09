"use server";

import { fail } from "@/lib/action-result";
import { profileSchema } from "@/lib/validation/site-settings";
import { requireAdmin } from "../../auth/require-admin";
import { updateSiteSettings } from "../../admin/settings";

/** Text fields only; avatar and resume come with uploads (Phase 5). */
export async function updateProfile(input: unknown) {
  await requireAdmin();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error);
  return updateSiteSettings("updateProfile", parsed.data);
}
