import type { Section, SectionKey } from "@/lib/validation/site-settings";

/** Number of visible items per section; the home page passes these in. */
export type SectionCounts = Partial<Record<SectionKey, number>>;

/**
 * Sections to render on the home page, in configured order (SPEC §7.3): hidden sections and
 * visible-but-empty sections are dropped; `contact` always renders when visible.
 */
export function renderableSections(sections: Section[], counts: SectionCounts) {
  return sections.filter(
    (s) => s.visible && (s.key === "contact" || (counts[s.key] ?? 0) > 0),
  );
}

const MAX_FEATURED = 6;
const FALLBACK_COUNT = 3;

/** Home projects (SPEC §8.4): featured (max 6), else the first 3 published. Input is already ordered. */
export function pickHomeProjects<T extends { featured: boolean }>(
  published: T[],
) {
  const featured = published.filter((p) => p.featured);
  const projects =
    featured.length > 0
      ? featured.slice(0, MAX_FEATURED)
      : published.slice(0, FALLBACK_COUNT);
  return { projects, hasMore: published.length > projects.length };
}
