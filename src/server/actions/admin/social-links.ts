"use server";

import { fail } from "@/lib/action-result";
import { socialLinkSchema } from "@/lib/validation/social-link";
import { requireAdmin } from "../../auth/require-admin";
import { listResource } from "../../admin/resource";
import { socialLinks } from "../../db/schema";

type SocialLink = typeof socialLinks.$inferSelect;
const links = listResource<SocialLink>(socialLinks, "Link");

export async function createSocialLink(input: unknown) {
  await requireAdmin();
  const parsed = socialLinkSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error);
  return links.create("createSocialLink", parsed.data);
}

export async function updateSocialLink(id: unknown, input: unknown) {
  await requireAdmin();
  const parsed = socialLinkSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error);
  return links.update("updateSocialLink", id, parsed.data);
}

export async function setSocialLinkVisible(id: unknown, visible: unknown) {
  await requireAdmin();
  return links.setVisible("setSocialLinkVisible", id, visible);
}

export async function deleteSocialLink(id: unknown) {
  await requireAdmin();
  return links.remove("deleteSocialLink", id);
}

export async function reorderSocialLinks(ids: unknown) {
  await requireAdmin();
  return links.reorder("reorderSocialLinks", ids);
}
