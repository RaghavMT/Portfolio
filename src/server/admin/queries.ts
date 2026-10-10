import "server-only";
import { and, asc, count, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client";
import {
  certifications,
  education,
  experiences,
  messages,
  projectImages,
  projects,
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
      avatarUrl: siteSettings.avatarUrl,
      avatarAlt: siteSettings.avatarAlt,
      resumeUrl: siteSettings.resumeUrl,
      resumeUpdatedAt: siteSettings.resumeUpdatedAt,
      ogImageUrl: siteSettings.ogImageUrl,
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

/** Project list rows: no long Markdown bodies, drafts included, in display order. */
export function listProjects() {
  return db
    .select({
      id: projects.id,
      slug: projects.slug,
      title: projects.title,
      summary: projects.summary,
      tech: projects.tech,
      status: projects.status,
      featured: projects.featured,
      coverImageUrl: projects.coverImageUrl,
      coverImageAlt: projects.coverImageAlt,
      updatedAt: projects.updatedAt,
    })
    .from(projects)
    .orderBy(asc(projects.sortOrder), desc(projects.createdAt));
}
export type AdminProjectRow = Awaited<ReturnType<typeof listProjects>>[number];

/** One full project (with its gallery in display order) for the edit form, or null (also for a malformed id). */
export async function getAdminProject(id: string) {
  if (!z.uuid().safeParse(id).success) return null;
  const [row] = await db.select().from(projects).where(eq(projects.id, id));
  if (!row) return null;
  const gallery = await db
    .select({
      url: projectImages.url,
      alt: projectImages.alt,
      caption: projectImages.caption,
    })
    .from(projectImages)
    .where(eq(projectImages.projectId, id))
    .orderBy(asc(projectImages.sortOrder), desc(projectImages.createdAt));
  return { ...row, gallery };
}
export type AdminProject = NonNullable<
  Awaited<ReturnType<typeof getAdminProject>>
>;

/**
 * A project of ANY status plus its gallery and where it would sit among the published ones, for the
 * admin draft preview (SPEC §9.10). Same shape as the public `getProjectBySlug`. Null for an unknown
 * or malformed id. Admin only: it returns drafts.
 */
export async function getPreviewProject(id: string) {
  if (!z.uuid().safeParse(id).success) return null;
  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  if (!project) return null;

  const [images, ordered] = await Promise.all([
    db
      .select()
      .from(projectImages)
      .where(eq(projectImages.projectId, id))
      .orderBy(asc(projectImages.sortOrder), desc(projectImages.createdAt)),
    db
      .select({ id: projects.id, slug: projects.slug, title: projects.title })
      .from(projects)
      .where(eq(projects.status, "published"))
      .orderBy(asc(projects.sortOrder), desc(projects.createdAt)),
  ]);

  // A published project sits where it is; a draft is shown as if it were last in line.
  const index = ordered.findIndex((p) => p.id === id);
  const position = index >= 0 ? index : ordered.length;
  const toLink = (p: { slug: string; title: string } | undefined) =>
    p ? { slug: p.slug, title: p.title } : null;
  return {
    project,
    images,
    previous: toLink(ordered[position - 1]),
    next: index >= 0 ? toLink(ordered[position + 1]) : null,
  };
}

/** Every tech tag used on any project, for the tag input's suggestions. */
export async function listProjectTechTags() {
  const rows = await db.select({ tech: projects.tech }).from(projects);
  return [...new Set(rows.flatMap((r) => r.tech))].sort((a, b) =>
    a.localeCompare(b),
  );
}

/** Counts for the dashboard cards and the profile checklist (SPEC §9.3). */
export async function getDashboardData() {
  const [statusRows, [links]] = await Promise.all([
    db
      .select({ status: projects.status, n: count() })
      .from(projects)
      .groupBy(projects.status),
    db
      .select({ n: count() })
      .from(socialLinks)
      .where(eq(socialLinks.visible, true)),
  ]);
  const byStatus = (status: "published" | "draft") =>
    statusRows.find((r) => r.status === status)?.n ?? 0;
  return {
    publishedProjects: byStatus("published"),
    draftProjects: byStatus("draft"),
    visibleSocialLinks: links?.n ?? 0,
  };
}

const INBOX_LIMIT = 200;

/** Newest first, archived included (the inbox filters in the browser); capped at 200 rows. */
export function listMessages() {
  return db
    .select({
      id: messages.id,
      name: messages.name,
      email: messages.email,
      company: messages.company,
      subject: messages.subject,
      body: messages.body,
      readAt: messages.readAt,
      archived: messages.archived,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .orderBy(desc(messages.createdAt))
    .limit(INBOX_LIMIT);
}
export type AdminMessage = Awaited<ReturnType<typeof listMessages>>[number];

/** Unread, not archived: the number on the sidebar badge (SPEC §9.1). */
export async function countUnreadMessages() {
  const [row] = await db
    .select({ n: count() })
    .from(messages)
    .where(and(isNull(messages.readAt), eq(messages.archived, false)));
  return row?.n ?? 0;
}
