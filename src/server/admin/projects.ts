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
import { unusedFiles } from "@/lib/upload-rules";
import type {
  ProjectFormValues,
  ProjectStatus,
} from "@/lib/validation/project";
import { applyOrder } from "./crud";
import { runMutation } from "./run";
import { db } from "../db/client";
import { projectImages, projects, type Project } from "../db/schema";
import { assertOwnBlobUrls, deleteBlobs } from "../blob";

/**
 * Project writes (SPEC §9.5). Action files call these AFTER `requireAdmin()` and Zod validation.
 * Cover and gallery are saved with the form (SPEC §10.1): their URLs are re-checked against this
 * store, the rows are replaced in one atomic batch, and files no longer used are deleted AFTER the
 * save succeeded (§10.4). Deleting a project removes its gallery rows (DB cascade) and its blobs.
 */

const idSchema = z.uuid();
const notFound = () => failMessage("Project not found.");

export const PROJECT_CONSTRAINTS = {
  projects_slug_unique: {
    field: "slug",
    message: "Another project already uses that slug.",
  },
};

/** Gallery rows for a project, in the submitted order. */
const galleryRows = (
  projectId: string,
  gallery: ProjectFormValues["gallery"],
) =>
  gallery.map((image, index) => ({
    projectId,
    url: image.url,
    alt: image.alt,
    caption: image.caption,
    sortOrder: index,
  }));

/** Every Blob file a project currently uses. */
const filesOf = (
  cover: string | null | undefined,
  gallery: readonly { url: string }[],
) => [cover, ...gallery.map((g) => g.url)];

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
      try {
        assertOwnBlobUrls(filesOf(values.coverImageUrl, values.gallery));
      } catch {
        return failMessage("One of the images isn't valid. Upload it again.");
      }
      if (values.status === "published") {
        const problems = publishProblems(values);
        if (problems.length) return publishFailure(problems);
      }
      const [{ next }] = await db
        .select({
          next: sql<number>`coalesce(max(${projects.sortOrder}), -1) + 1`,
        })
        .from(projects);
      const { gallery, ...fields } = values;
      // The id is chosen here so the project and its gallery go in as one atomic batch.
      const id = crypto.randomUUID();
      const insertProject = db
        .insert(projects)
        .values({
          ...fields,
          id,
          featured: featuredFor(values.status, values.featured),
          publishedAt: nextPublishedAt(null, values.status, new Date()),
          sortOrder: next,
        })
        .returning();
      const [[row]] = gallery.length
        ? await db.batch([
            insertProject,
            db.insert(projectImages).values(galleryRows(id, gallery)),
          ])
        : await db.batch([insertProject]);
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
      try {
        assertOwnBlobUrls(filesOf(values.coverImageUrl, values.gallery));
      } catch {
        return failMessage("One of the images isn't valid. Upload it again.");
      }
      const [existing] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, parsedId.data));
      if (!existing) return notFound();
      if (values.status === "published") {
        const problems = publishProblems(values);
        if (problems.length) return publishFailure(problems);
      }
      const oldGallery = await db
        .select({ url: projectImages.url })
        .from(projectImages)
        .where(eq(projectImages.projectId, existing.id));

      const { gallery, ...fields } = values;
      const updateProject = db
        .update(projects)
        .set({
          ...fields,
          featured: featuredFor(values.status, values.featured),
          publishedAt: nextPublishedAt(
            existing.publishedAt,
            values.status,
            new Date(),
          ),
        })
        .where(eq(projects.id, existing.id))
        .returning();
      const clearGallery = db
        .delete(projectImages)
        .where(eq(projectImages.projectId, existing.id));
      const [[row]] = gallery.length
        ? await db.batch([
            updateProject,
            clearGallery,
            db.insert(projectImages).values(galleryRows(existing.id, gallery)),
          ])
        : await db.batch([updateProject, clearGallery]);

      // Files the project no longer uses go only after the save succeeded (SPEC §10.4).
      await deleteBlobs(
        unusedFiles(
          filesOf(existing.coverImageUrl, oldGallery),
          filesOf(values.coverImageUrl, gallery),
        ),
      );
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
    // Read the files first: the cascade removes the gallery rows with the project.
    const [project] = await db
      .select({ cover: projects.coverImageUrl })
      .from(projects)
      .where(eq(projects.id, parsedId.data));
    const gallery = await db
      .select({ url: projectImages.url })
      .from(projectImages)
      .where(eq(projectImages.projectId, parsedId.data));
    const rows = await db
      .delete(projects)
      .where(eq(projects.id, parsedId.data))
      .returning({ id: projects.id });
    if (!rows.length) return notFound();
    await deleteBlobs(filesOf(project?.cover, gallery));
    return ok(undefined);
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
