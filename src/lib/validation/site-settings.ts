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
export const siteSettingsSchema = z
  .object({
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
  })
  .superRefine(altRequiredWithImage("avatarUrl", "avatarAlt"));

export type SiteSettingsInput = z.input<typeof siteSettingsSchema>;
export type SiteSettingsValues = z.output<typeof siteSettingsSchema>;
