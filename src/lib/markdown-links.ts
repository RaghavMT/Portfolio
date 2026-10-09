/**
 * Link rules for rendered Markdown (SPEC §12.4): only https:, http:, mailto:, and
 * same-site relative/anchor links survive. javascript:, data: etc. are dropped.
 */
export function safeHref(href: string | undefined): string | undefined {
  if (!href) return undefined;
  const value = href.trim();
  if (value === "" || value.startsWith("//")) return undefined;
  if (value.startsWith("/") || value.startsWith("#")) return value;
  return /^(https?:|mailto:)/i.test(value) ? value : undefined;
}

export function isExternalHref(href: string) {
  return /^https?:/i.test(href);
}
