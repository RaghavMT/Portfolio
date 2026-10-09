import { z } from "zod";
import {
  altRequiredWithImage,
  emailAddress,
  markdown,
  optionalHttpsUrl,
  optionalText,
  requiredText,
} from "./common";

/** Home-page sections in default render order (SPEC §7.3). Hero and footer are fixed and not listed. */
export const SECTION_KEYS = [
  "about",
  "projects",
  "experience",
  "skills",
  "education",
  "certifications",
  "contact",
] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

/** Accent presets (SPEC §8.9); each has AA-checked light/dark tokens in globals.css. */
export const ACCENTS = [
  "indigo",
  "blue",
  "teal",
  "emerald",
  "amber",
  "rose",
  "violet",
  "slate",
] as const;
export type Accent = (typeof ACCENTS)[number];

export const DEFAULT_SECTIONS: Section[] = SECTION_KEYS.map((key) => ({
  key,
  visible: true,
}));

export const sectionSchema = z.object({
  key: z.enum(SECTION_KEYS),
  visible: z.boolean(),
});
export type Section = z.infer<typeof sectionSchema>;

/** Every key exactly once; array order = render order. */
export const sectionsSchema = z
  .array(sectionSchema)
  .length(SECTION_KEYS.length, "Every section must be listed exactly once")
  .refine(
    (sections) =>
      new Set(sections.map((s) => s.key)).size === SECTION_KEYS.length,
    {
      message: "Every section must be listed exactly once",
    },
  );

/**
 * The editable fields of the `site_settings` singleton. Server-managed columns
 * (id, session_version, resume_updated_at, updated_at) are not part of the form.
 */
const siteSettingsShape = z.object({
  fullName: requiredText(80),
  headline: requiredText(120),
  tagline: optionalText(240),
  location: optionalText(80),
  openToWork: z.boolean().default(true),
  openToWorkText: optionalText(80),
  aboutMd: markdown(4000),
  avatarUrl: optionalHttpsUrl,
  avatarAlt: optionalText(160),
  resumeUrl: optionalHttpsUrl,
  contactEmail: emailAddress,
  contactFormEnabled: z.boolean().default(true),
  /** Null → rendered as "{fullName} — {headline}". */
  seoTitle: optionalText(70),
  seoDescription: requiredText(160),
  ogImageUrl: optionalHttpsUrl,
  accent: z.enum(ACCENTS).default("indigo"),
  sections: sectionsSchema.default(DEFAULT_SECTIONS),
});

export const siteSettingsSchema = siteSettingsShape.superRefine(
  altRequiredWithImage("avatarUrl", "avatarAlt"),
);

export type SiteSettingsInput = z.input<typeof siteSettingsSchema>;
export type SiteSettingsValues = z.output<typeof siteSettingsSchema>;

/**
 * Partial schemas for the admin forms. Each carries only its own columns (unknown keys are stripped),
 * so a Profile or Settings action can never write session_version, resume_*, avatar_* or og_image_*.
 * Avatar/resume/OG image arrive with the upload phase (SPEC §15 Phase 5).
 */
export const profileSchema = siteSettingsShape.pick({
  fullName: true,
  headline: true,
  tagline: true,
  location: true,
  openToWork: true,
  openToWorkText: true,
  aboutMd: true,
  contactEmail: true,
});
export type ProfileValues = z.output<typeof profileSchema>;

export const seoSchema = siteSettingsShape.pick({
  seoTitle: true,
  seoDescription: true,
});
export type SeoValues = z.output<typeof seoSchema>;

export const appearanceSchema = z.object({ accent: z.enum(ACCENTS) });
export const contactFormSchema = z.object({ contactFormEnabled: z.boolean() });
