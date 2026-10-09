const FALLBACK = "/admin";

/**
 * Validates the `next=` redirect target after login (SPEC §12.4): it must stay inside /admin,
 * so an attacker-crafted link cannot bounce a logged-in admin to another site.
 */
export function safeNext(next: string | null | undefined): string {
  if (!next) return FALLBACK;
  if (!/^\/admin(?:[/?].*)?$/.test(next)) return FALLBACK;
  if (next.includes("//") || next.includes("\\") || next.includes("..")) {
    return FALLBACK;
  }
  return next;
}
