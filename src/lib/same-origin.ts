/**
 * CSRF check for admin Route Handlers (SPEC §12.7): the browser's `Origin` must be this site's own
 * host. A missing or "null" Origin is refused; same-site fetches from our admin always send one.
 */
export function isSameOrigin(
  origin: string | null | undefined,
  host: string | null | undefined,
): boolean {
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
