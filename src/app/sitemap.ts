import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";
import { getLastUpdated, getPublishedSlugs } from "@/server/queries/public";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const [slugs, lastUpdated] = await Promise.all([
    getPublishedSlugs(),
    getLastUpdated(),
  ]);
  return [
    { url: base, lastModified: lastUpdated ?? undefined },
    { url: `${base}/projects`, lastModified: lastUpdated ?? undefined },
    ...slugs.map(({ slug, updatedAt }) => ({
      url: `${base}/projects/${slug}`,
      lastModified: updatedAt,
    })),
  ];
}
