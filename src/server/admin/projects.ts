import "server-only";
import { and, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import {
  type ActionResult,
  failMessage,
  type FieldErrors,
  ok,
} from "@/lib/action-result";
import {
  copyOf,
  nextPublishedAt,
  publishProblems,
  type PublishProblem,
} from "@/lib/admin/project";
import type {
  ProjectFormValues,
  ProjectStatus,
} from "@/lib/validation/project";
import { applyOrder } from "./crud";
import { runMutation } from "./run";
import { db } from "../db/client";
import { projects, type Project } from "../db/schema";

/**
 * Project writes (SPEC §9.5). Action files call these AFTER `requireAdmin()` and Zod validation.
 * Gallery rows (`project_images`) go with a deleted project through the DB cascade; deleting their
 * blobs is Phase 5 (D27).
 */

const idSchema = z.uuid();
const notFound = () => failMessage("Project not found.");

export const PROJECT_CONSTRAINTS = {
  projects_slug_unique: {
    field: "slug",
    message: "Another project already uses that slug.",
  },
};

function publishFailure(problems: PublishProblem[]) {
  const fieldErrors: FieldErrors = {};
  for (const p of problems) (fieldErrors[p.field] ??= []).push(p.message);
  return failMessage(problems[0].message, fieldErrors);
}

/** Only published projects can be featured (SPEC §7.2), so drafts are always saved as not featured. */
const featuredFor = (status: ProjectStatus, featured: boolean) =>
  status === "published" && featured;

export function createProjectRow(
  action: string,
  values: ProjectFormValues,
): Promise<ActionResult<Project>> {
  return runMutation(
    action,
    async () => {
      if (values.status === "published") {
        const problems = publishProblems(values);
        if (problems.length) return publishFailure(problems);
      }
      const [{ next }] = await db
        .select({
          next: sql<number>`coalesce(max(${projects.sortOrder}), -1) + 1`,
        })
        .from(projects);
      const [row] = await db
        .insert(projects)
        .values({
          ...values,
          featured: featuredFor(values.status, values.featured),
          publishedAt: nextPublishedAt(null, values.status, new Date()),
          sortOrder: next,
        })
        .returning();
      return ok(row);
    },
    PROJECT_CONSTRAINTS,
  );
}

export function updateProjectRow(
  action: string,
  id: unknown,
  values: ProjectFormValues,
): Promise<ActionResult<Project>> {
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return Promise.resolve(notFound());
  return runMutation(
    action,
    async () => {
      const [existing] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, parsedId.data));
      if (!existing) return notFound();
      if (values.status === "published") {
        const problems = publishProblems({
          ...values,
          coverImageUrl: existing.coverImageUrl,
          coverImageAlt: existing.coverImageAlt,
        });
        if (problems.length) return publishFailure(problems);
      }
      const [row] = await db
        .update(projects)
        .set({
          ...values,
          featured: featuredFor(values.status, values.featured),
          publishedAt: nextPublishedAt(
            existing.publishedAt,
            values.status,
            new Date(),
          ),
        })
        .where(eq(projects.id, existing.id))
        .returning();
      return ok(row);
    },
    PROJECT_CONSTRAINTS,
  );
}

/** Quick publish / unpublish from the list. Unpublishing also clears `featured`. */
export function setProjectStatusRow(
  action: string,
  id: unknown,
  status: unknown,
): Promise<ActionResult<void>> {
  const parsedId = idSchema.safeParse(id);
  const parsedStatus = z.enum(["draft", "published"]).safeParse(status);
  if (!parsedId.success || !parsedStatus.success) {
    return Promise.resolve(notFound());
  }
  return runMutation(action, async () => {
    const [existing] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, parsedId.data));
    if (!existing) return notFound();
    if (parsedStatus.data === "published") {
      const problems = publishProblems(existing);
      if (problems.length) return publishFailure(problems);
    }
    await db
      .update(projects)
      .set({
        status: parsedStatus.data,
        featured: featuredFor(parsedStatus.data, existing.featured),
        publishedAt: nextPublishedAt(
          existing.publishedAt,
          parsedStatus.data,
          new Date(),
        ),
      })
      .where(eq(projects.id, existing.id));
    return ok(undefined);
  });
}

export function setProjectFeaturedRow(
  action: string,
  id: unknown,
  featured: unknown,
): Promise<ActionResult<void>> {
  const parsedId = idSchema.safeParse(id);
  const parsedFeatured = z.boolean().safeParse(featured);
  if (!parsedId.success || !parsedFeatured.success) {
    return Promise.resolve(notFound());
  }
  return runMutation(action, async () => {
    const [existing] = await db
      .select({ status: projects.status })
      .from(projects)
      .where(eq(projects.id, parsedId.data));
    if (!existing) return notFound();
    if (parsedFeatured.data && existing.status !== "published") {
      return failMessage("Publish the project before featuring it.");
    }
    await db
      .update(projects)
      .set({ featured: parsedFeatured.data })
      .where(eq(projects.id, parsedId.data));
    return ok(undefined);
  });
}

export function reorderProjectRows(
  action: string,
  ids: unknown,
): Promise<ActionResult<void>> {
  const parsed = z.array(idSchema).safeParse(ids);
  if (!parsed.success) {
    return Promise.resolve(failMessage("Couldn't save the new order."));
  }
  return runMutation(action, async () => {
    const existing = await db.select({ id: projects.id }).from(projects);
    const saved = await applyOrder(
      projects,
      existing.map((r) => r.id),
      parsed.data,
    );
    return saved
      ? ok(undefined)
      : failMessage("The list changed — reload the page and try again.");
  });
}

/** "Copy of …", draft, new unique slug, not featured, no images (SPEC §9.5). */
export function duplicateProjectRow(
  action: string,
  id: unknown,
): Promise<ActionResult<Project>> {
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return Promise.resolve(notFound());
  return runMutation(
    action,
    async () => {
      const [source] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, parsedId.data));
      if (!source) return notFound();
      const slugs = await db.select({ slug: projects.slug }).from(projects);
      const { title, slug } = copyOf(
        source.title,
        slugs.map((r) => r.slug),
      );
      const [{ next }] = await db
        .select({
          next: sql<number>`coalesce(max(${projects.sortOrder}), -1) + 1`,
        })
        .from(projects);
      const [row] = await db
        .insert(projects)
        .values({
          title,
          slug,
          summary: source.summary,
          role: source.role,
          problemMd: source.problemMd,
          approachMd: source.approachMd,
          outcomeMd: source.outcomeMd,
          tech: source.tech,
          liveUrl: source.liveUrl,
          repoUrl: source.repoUrl,
          caseStudyUrl: source.caseStudyUrl,
          startedOn: source.startedOn,
          endedOn: source.endedOn,
          status: "draft",
          featured: false,
          publishedAt: null,
          sortOrder: next,
        })
        .returning();
      return ok(row);
    },
    PROJECT_CONSTRAINTS,
  );
}

export function deleteProjectRow(
  action: string,
  id: unknown,
): Promise<ActionResult<void>> {
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return Promise.resolve(notFound());
  return runMutation(action, async () => {
    const rows = await db
      .delete(projects)
      .where(eq(projects.id, parsedId.data))
      .returning({ id: projects.id });
    return rows.length ? ok(undefined) : notFound();
  });
}

/** True when no OTHER project uses `slug` (the form calls this on blur; save re-checks via the DB). */
export async function isSlugFree(
  slug: string,
  excludeId?: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: projects.id })
    .from(projects)
    .where(
      excludeId
        ? and(eq(projects.slug, slug), ne(projects.id, excludeId))
        : eq(projects.slug, slug),
    );
  return rows.length === 0;
}
