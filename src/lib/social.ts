import type { SocialPlatform as Platform } from "@/lib/validation/social-link";

export const SOCIAL_PLATFORM_LABELS: Record<Platform, string> = {
  github: "GitHub",
  linkedin: "LinkedIn",
  leetcode: "LeetCode",
  x: "X",
  kaggle: "Kaggle",
  medium: "Medium",
  website: "Website",
  email: "Email",
  other: "Link",
};

/** Visible text for a social link; `other` uses its custom label (SPEC §7.2). */
export function socialLabel(platform: Platform, label: string | null) {
  return platform === "other" && label
    ? label
    : SOCIAL_PLATFORM_LABELS[platform];
}
