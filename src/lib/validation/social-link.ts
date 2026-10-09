import { z } from "zod";
import { httpsUrl, mailtoUrl, optionalText } from "./common";

export const SOCIAL_PLATFORMS = [
  "github",
  "linkedin",
  "leetcode",
  "x",
  "kaggle",
  "medium",
  "website",
  "email",
  "other",
] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export const socialLinkSchema = z
  .object({
    platform: z.enum(SOCIAL_PLATFORMS),
    label: optionalText(40),
    url: z.string().trim(),
    visible: z.boolean().default(true),
  })
  .superRefine((link, ctx) => {
    const urlCheck = link.platform === "email" ? mailtoUrl : httpsUrl;
    const result = urlCheck.safeParse(link.url);
    if (!result.success) {
      ctx.addIssue({
        code: "custom",
        path: ["url"],
        message: result.error.issues[0]?.message ?? "Invalid link",
      });
    }
    if (link.platform === "other" && !link.label) {
      ctx.addIssue({
        code: "custom",
        path: ["label"],
        message: "Name this link (e.g. Blog)",
      });
    }
  });

export type SocialLinkValues = z.output<typeof socialLinkSchema>;
