import { z } from "zod";
import { blobUrl, httpsUrl, optionalText, requiredText } from "./common";

/** Max gallery images per project; enforced by the gallery action (SPEC §7.2). */
export const MAX_PROJECT_IMAGES = 12;

export const projectImageSchema = z.object({
  url: httpsUrl,
  alt: requiredText(160),
  caption: optionalText(200),
});

export type ProjectImageValues = z.output<typeof projectImageSchema>;

/** A gallery image as the project form submits it: the file must live in our Blob store. */
export const galleryImageSchema = projectImageSchema.extend({ url: blobUrl });
export type GalleryImageValues = z.output<typeof galleryImageSchema>;
