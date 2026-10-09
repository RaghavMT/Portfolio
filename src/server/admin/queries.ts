import "server-only";
import { asc, desc } from "drizzle-orm";
import { db } from "../db/client";
import { socialLinks } from "../db/schema";

/**
 * Admin reads (SPEC §14.1): every row, hidden and draft included, uncached. Only call these from
 * admin pages that already passed `requireAdminPage()`. Order matches the public site (§7.1).
 */

export function listSocialLinks() {
  return db
    .select()
    .from(socialLinks)
    .orderBy(asc(socialLinks.sortOrder), desc(socialLinks.createdAt));
}

export type AdminSocialLink = Awaited<
  ReturnType<typeof listSocialLinks>
>[number];
