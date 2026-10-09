/** True when `submitted` contains exactly the ids in `existing`: no missing, unknown or repeated ids. */
export function sameIdSet(
  submitted: readonly string[],
  existing: readonly string[],
): boolean {
  if (submitted.length !== existing.length) return false;
  const known = new Set(existing);
  const seen = new Set<string>();
  for (const id of submitted) {
    if (!known.has(id) || seen.has(id)) return false;
    seen.add(id);
  }
  return true;
}

/** Returns a copy of `list` with the item at `from` moved to `to`; out-of-range moves are no-ops. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const copy = [...list];
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= copy.length ||
    to >= copy.length
  ) {
    return copy;
  }
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}
