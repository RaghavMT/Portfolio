import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { CONTENT_TAG } from "@/server/cache";
import { db } from "@/server/db/client";
import {
  certifications,
  education,
  experiences,
  projectImages,
  projects,
  siteSettings,
  skillGroups,
  skills,
  socialLinks,
} from "@/server/db/schema";

/**
 * Public reads (SPEC §12.3 #4): published/visible rows only, cached and tagged with `content`
 * so visitors never hit Neon directly (§5.3). Admin mutations expire the tag (invalidateContent).
 * Ordering is `sort_order ASC, created_at DESC` (§7.1).
 */

const published = eq(projects.status, "published");
const byProject = [asc(projects.sortOrder), desc(projects.createdAt)];

export async function getSettings() {
  "use cache";
  cacheTag(CONTENT_TAG);
  cacheLife("max");
  const [row] = await db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.id, 1));
  return row ?? null;
}

export async function getSocialLinks() {
  "use cache";
  cacheTag(CONTENT_TAG);
  cacheLife("max");
  return db
    .select()
    .from(socialLinks)
    .where(eq(socialLinks.visible, true))
    .orderBy(asc(socialLinks.sortOrder), desc(socialLinks.createdAt));
}

/** Every published project, in display order. Home and /projects both derive from this. */
export async function getPublishedProjects() {
  "use cache";
  cacheTag(CONTENT_TAG);
  cacheLife("max");
  return db
    .select()
    .from(projects)
    .where(published)
    .orderBy(...byProject);
}

/** A published project plus its gallery and neighbours, or null (draft and unknown slugs → 404). */
export async function getProjectBySlug(slug: string) {
  "use cache";
  cacheTag(CONTENT_TAG);
  cacheLife("max");
  const [project] = await db
    .select()
    .from(projects)
    .where(and(published, eq(projects.slug, slug)));
  if (!project) return null;

  const [images, ordered] = await Promise.all([
    db
      .select()
      .from(projectImages)
      .where(eq(projectImages.projectId, project.id))
      .orderBy(asc(projectImages.sortOrder), desc(projectImages.createdAt)),
    db
      .select({ slug: projects.slug, title: projects.title })
      .from(projects)
      .where(published)
      .orderBy(...byProject),
  ]);
  const index = ordered.findIndex((p) => p.slug === slug);
  return {
    project,
    images,
    previous: index > 0 ? ordered[index - 1] : null,
    next: index >= 0 && index < ordered.length - 1 ? ordered[index + 1] : null,
  };
}

export async function getPublishedSlugs() {
  "use cache";
  cacheTag(CONTENT_TAG);
  cacheLife("max");
  return db
    .select({ slug: projects.slug, updatedAt: projects.updatedAt })
    .from(projects)
    .where(published)
    .orderBy(...byProject);
}

export async function getExperiences() {
  "use cache";
  cacheTag(CONTENT_TAG);
  cacheLife("max");
  return db
    .select()
    .from(experiences)
    .where(eq(experiences.visible, true))
    .orderBy(asc(experiences.sortOrder), desc(experiences.createdAt));
}

export async function getSkillGroups() {
  "use cache";
  cacheTag(CONTENT_TAG);
  cacheLife("max");
  const [groups, items] = await Promise.all([
    db
      .select()
      .from(skillGroups)
      .where(eq(skillGroups.visible, true))
      .orderBy(asc(skillGroups.sortOrder), desc(skillGroups.createdAt)),
    db
      .select()
      .from(skills)
      .where(eq(skills.visible, true))
      .orderBy(asc(skills.sortOrder), desc(skills.createdAt)),
  ]);
  return groups
    .map((group) => ({
      ...group,
      skills: items.filter((s) => s.groupId === group.id),
    }))
    .filter((group) => group.skills.length > 0);
}

export async function getEducation() {
  "use cache";
  cacheTag(CONTENT_TAG);
  cacheLife("max");
  return db
    .select()
    .from(education)
    .where(eq(education.visible, true))
    .orderBy(asc(education.sortOrder), desc(education.createdAt));
}

export async function getCertifications() {
  "use cache";
  cacheTag(CONTENT_TAG);
  cacheLife("max");
  return db
    .select()
    .from(certifications)
    .where(eq(certifications.visible, true))
    .orderBy(asc(certifications.sortOrder), desc(certifications.createdAt));
}

/** Footer "Last updated" (SPEC §8.10): newest `updated_at` across public content. */
export async function getLastUpdated() {
  "use cache";
  cacheTag(CONTENT_TAG);
  cacheLife("max");
  const [row] = await db
    .execute<{ at: string | null }>(
      sql`
    select greatest(
      (select max(updated_at) from site_settings),
      (select max(updated_at) from projects where status = 'published'),
      (select max(updated_at) from experiences where visible),
      (select max(updated_at) from education where visible),
      (select max(updated_at) from skill_groups where visible),
      (select max(updated_at) from skills where visible),
      (select max(updated_at) from certifications where visible),
      (select max(updated_at) from social_links where visible)
    ) as at
  `,
    )
    .then((r) => r.rows);
  return row?.at ? new Date(row.at) : null;
}
