import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "../db/client";
import {
  certifications,
  education,
  experiences,
  siteSettings,
  skillGroups,
  skills,
  socialLinks,
} from "../db/schema";

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

export function listCertifications() {
  return db
    .select()
    .from(certifications)
    .orderBy(asc(certifications.sortOrder), desc(certifications.createdAt));
}
export type AdminCertification = Awaited<
  ReturnType<typeof listCertifications>
>[number];

export function listEducation() {
  return db
    .select()
    .from(education)
    .orderBy(asc(education.sortOrder), desc(education.createdAt));
}
export type AdminEducation = Awaited<ReturnType<typeof listEducation>>[number];

export function listExperiences() {
  return db
    .select()
    .from(experiences)
    .orderBy(asc(experiences.sortOrder), desc(experiences.createdAt));
}
export type AdminExperience = Awaited<
  ReturnType<typeof listExperiences>
>[number];

export type AdminSkill = typeof skills.$inferSelect;
export type AdminSkillGroup = typeof skillGroups.$inferSelect & {
  skills: AdminSkill[];
};

/** Every group (hidden included) with its skills, both in display order. */
export async function listSkillGroups(): Promise<AdminSkillGroup[]> {
  const [groups, items] = await Promise.all([
    db
      .select()
      .from(skillGroups)
      .orderBy(asc(skillGroups.sortOrder), desc(skillGroups.createdAt)),
    db
      .select()
      .from(skills)
      .orderBy(asc(skills.sortOrder), desc(skills.createdAt)),
  ]);
  return groups.map((group) => ({
    ...group,
    skills: items.filter((s) => s.groupId === group.id),
  }));
}

/**
 * The editable columns of the settings singleton. `session_version` is deliberately left out: it
 * never needs to reach a client component.
 */
export async function getAdminSettings() {
  const [row] = await db
    .select({
      fullName: siteSettings.fullName,
      headline: siteSettings.headline,
      tagline: siteSettings.tagline,
      location: siteSettings.location,
      openToWork: siteSettings.openToWork,
      openToWorkText: siteSettings.openToWorkText,
      aboutMd: siteSettings.aboutMd,
      contactEmail: siteSettings.contactEmail,
      contactFormEnabled: siteSettings.contactFormEnabled,
      seoTitle: siteSettings.seoTitle,
      seoDescription: siteSettings.seoDescription,
      accent: siteSettings.accent,
      sections: siteSettings.sections,
    })
    .from(siteSettings)
    .where(eq(siteSettings.id, 1));
  return row;
}
export type AdminSettings = NonNullable<
  Awaited<ReturnType<typeof getAdminSettings>>
>;
