/** Project slug rules (SPEC §7.2 `projects.slug`). Shared by the form, the action and the seed. */

export const SLUG_MAX_LENGTH = 80;
export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** Would collide with routes under /projects or /admin. */
export const RESERVED_SLUGS = ["new", "edit", "admin", "api"] as const;

export function isValidSlug(slug: string): boolean {
  return (
    slug.length <= SLUG_MAX_LENGTH &&
    SLUG_REGEX.test(slug) &&
    !(RESERVED_SLUGS as readonly string[]).includes(slug)
  );
}

/** "Café — Résumé Builder (v2)" → "cafe-resume-builder-v2". May return "" or a reserved word; callers validate. */
export function slugify(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/, "");
}
