type Env = Record<string, string | undefined>;

const LOCAL = "http://localhost:3000";

function clean(url: string | undefined) {
  if (!url) return null;
  const trimmed = url.trim().replace(/\/+$/, "");
  // Only absolute https URLs (or local http) may become canonical/OG URLs.
  return /^https:\/\/[^/]/.test(trimmed) ||
    /^http:\/\/localhost(:\d+)?$/.test(trimmed)
    ? trimmed
    : null;
}

/**
 * Absolute site origin (SPEC §13.3): NEXT_PUBLIC_SITE_URL, else the Vercel production domain,
 * else localhost. Update the env var when a custom domain is added.
 */
export function resolveSiteUrl(env: Env): string {
  const explicit = clean(env.NEXT_PUBLIC_SITE_URL);
  if (explicit) return explicit;
  const vercel = env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) {
    const url = clean(`https://${vercel}`);
    if (url) return url;
  }
  return LOCAL;
}

export const siteUrl = () => resolveSiteUrl(process.env);
