import { isValidSlug, slugify, SLUG_MAX_LENGTH } from "../slug";
import type { ProjectStatus } from "../validation/project";

/**
 * Cover image + alt text are required to publish (SPEC §9.5). Off in Phase 4 (no uploads yet, D27);
 * on since Phase 5. A unit test pins the value.
 */
export const REQUIRE_COVER_ON_PUBLISH = true;

export type PublishProblem = {
  field: "summary" | "tech" | "coverImageUrl" | "coverImageAlt";
  message: string;
};

type Candidate = {
  summary: string;
  tech: readonly string[];
  coverImageUrl?: string | null;
  coverImageAlt?: string | null;
};

/** The stricter rules a project must meet to be published (SPEC §9.5). Empty = ready. */
export function publishProblems(
  project: Candidate,
  { requireCover = REQUIRE_COVER_ON_PUBLISH }: { requireCover?: boolean } = {},
): PublishProblem[] {
  const problems: PublishProblem[] = [];
  if (!project.summary.trim()) {
    problems.push({
      field: "summary",
      message: "Add a summary before publishing.",
    });
  }
  if (project.tech.length === 0) {
    problems.push({
      field: "tech",
      message: "Add at least one technology before publishing.",
    });
  }
  if (requireCover) {
    if (!project.coverImageUrl) {
      problems.push({
        field: "coverImageUrl",
        message: "Add a cover image before publishing.",
      });
    } else if (!project.coverImageAlt) {
      problems.push({
        field: "coverImageAlt",
        message: "Describe the cover image before publishing.",
      });
    }
  }
  return problems;
}

/** `published_at` is set only the first time a project is published (SPEC §7.2) and never cleared. */
export function nextPublishedAt(
  existing: Date | null,
  status: ProjectStatus,
  now: Date,
): Date | null {
  return status === "published" ? (existing ?? now) : existing;
}

/** `base`, or `base-2`, `base-3`, … until it is not in `taken`; always a valid, non-reserved slug. */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  const root = isValidSlug(base) ? base : "project";
  if (!used.has(root) && isValidSlug(root)) return root;
  for (let n = 2; ; n++) {
    const suffix = `-${n}`;
    const candidate = `${root.slice(0, SLUG_MAX_LENGTH - suffix.length).replace(/-+$/, "")}${suffix}`;
    if (!used.has(candidate) && isValidSlug(candidate)) return candidate;
  }
}

const COPY_PREFIX = "Copy of ";
const TITLE_MAX_LENGTH = 100;

/** Title and unique slug for a duplicated project (SPEC §9.5): "Copy of …", slug not in `takenSlugs`. */
export function copyOf(
  title: string,
  takenSlugs: Iterable<string>,
): { title: string; slug: string } {
  const copyTitle = `${COPY_PREFIX}${title}`.slice(0, TITLE_MAX_LENGTH).trim();
  return { title: copyTitle, slug: uniqueSlug(slugify(copyTitle), takenSlugs) };
}
