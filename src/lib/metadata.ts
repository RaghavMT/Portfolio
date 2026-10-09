import type { Metadata } from "next";

/** Title, description, canonical, Open Graph and Twitter card for one public page (SPEC §13.3). */
export function pageMetadata({
  title,
  description,
  path,
  image,
  type = "website",
}: {
  title: string;
  description: string;
  /** Site-relative path, e.g. "/projects/foo"; resolved against metadataBase. */
  path: string;
  /** Absolute or site-relative image URL; omit to use the generated /opengraph-image. */
  image?: string | null;
  type?: "website" | "article";
}): Metadata {
  const images = image ? [{ url: image }] : undefined;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, type, images },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}
