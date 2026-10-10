import { z } from "zod";
import { galleryImageSchema, MAX_PROJECT_IMAGES } from "./project-image";
import { isValidSlug, RESERVED_SLUGS } from "../slug";
import {
  altRequiredWithImage,
  endNotBeforeStart,
  markdown,
  optionalBlobUrl,
  optionalHttpsUrl,
  optionalMonthDate,
  optionalText,
  requiredText,
  tagList,
} from "./common";

export const PROJECT_STATUSES = ["draft", "published"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const slugSchema = z
  .string()
  .trim()
  .refine(
    isValidSlug,
    `Use lowercase letters, numbers and single hyphens (max 80; not ${RESERVED_SLUGS.join(", ")})`,
  );

const projectShape = z.object({
  slug: slugSchema,
  title: requiredText(100),
  summary: requiredText(200),
  role: optionalText(80),
  problemMd: markdown(3000),
  approachMd: markdown(5000),
  outcomeMd: markdown(3000),
  tech: tagList(20, 30),
  coverImageUrl: optionalHttpsUrl,
  coverImageAlt: optionalText(160),
  liveUrl: optionalHttpsUrl,
  repoUrl: optionalHttpsUrl,
  caseStudyUrl: optionalHttpsUrl,
  status: z.enum(PROJECT_STATUSES).default("draft"),
  featured: z.boolean().default(false),
  startedOn: optionalMonthDate,
  /** Null = "Ongoing". */
  endedOn: optionalMonthDate,
});

/** Project fields (SPEC §7.2). Stricter publish rules (cover, ≥1 tag) are applied by the publish action. */
export const projectSchema = projectShape.superRefine((project, ctx) => {
  altRequiredWithImage("coverImageUrl", "coverImageAlt")(project, ctx);
  endNotBeforeStart("startedOn", "endedOn")(project, ctx);
});

/**
 * What the admin project form submits (SPEC §9.5): the project fields, the cover image (a file in our
 * Blob store, alt text required) and the gallery in display order. The save is the source of truth for
 * uploads (§10.1), so the form always sends the cover and gallery it is showing.
 */
export const projectFormSchema = projectShape
  .extend({
    coverImageUrl: optionalBlobUrl,
    gallery: z
      .array(galleryImageSchema)
      .max(MAX_PROJECT_IMAGES, `At most ${MAX_PROJECT_IMAGES} images`)
      .default([]),
  })
  .superRefine((project, ctx) => {
    altRequiredWithImage("coverImageUrl", "coverImageAlt")(project, ctx);
    endNotBeforeStart("startedOn", "endedOn")(project, ctx);
  });

export type ProjectValues = z.output<typeof projectSchema>;
export type ProjectFormValues = z.output<typeof projectFormSchema>;
