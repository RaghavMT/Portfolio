type Limits = { max?: number; maxLength?: number };

/**
 * Adds the comma-separated tags in `input` to `existing` (SPEC §9.5): trimmed, blanks dropped,
 * case-insensitive de-duplication (first spelling wins), over-long tags skipped, capped at `max`.
 */
export function addTags(
  existing: readonly string[],
  input: string,
  { max = Infinity, maxLength = Infinity }: Limits = {},
): string[] {
  const result = [...existing];
  const seen = new Set(result.map((t) => t.toLowerCase()));
  for (const raw of input.split(",")) {
    const tag = raw.trim();
    if (!tag || tag.length > maxLength || seen.has(tag.toLowerCase())) continue;
    if (result.length >= max) break;
    seen.add(tag.toLowerCase());
    result.push(tag);
  }
  return result;
}

/** Existing tags starting with `query` (case-insensitive) that aren't already chosen. */
export function suggestTags(
  all: readonly string[],
  chosen: readonly string[],
  query: string,
  limit = 6,
): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const taken = new Set(chosen.map((t) => t.toLowerCase()));
  return all
    .filter((t) => t.toLowerCase().startsWith(q) && !taken.has(t.toLowerCase()))
    .slice(0, limit);
}
