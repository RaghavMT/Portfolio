/** Dashboard rules (SPEC §9.3): the profile checklist and the résumé age warning. Pure, so it is unit-tested. */

export const STALE_RESUME_DAYS = 90;
const MIN_PUBLISHED_PROJECTS = 3;

export type ChecklistInput = {
  avatarUrl: string | null;
  aboutMd: string;
  publishedProjects: number;
  resumeUrl: string | null;
  visibleSocialLinks: number;
  seoDescription: string;
};

export type ChecklistKey =
  "avatar" | "about" | "projects" | "resume" | "social" | "seo";

export type ChecklistItem = {
  key: ChecklistKey;
  label: string;
  done: boolean;
  href: string;
};

/** Real text only: blank, or the seed's `TODO:` placeholder (SPEC §19.3), counts as missing. */
function hasRealText(value: string) {
  const text = value.trim();
  return text !== "" && !/^todo\b/i.test(text);
}

export function profileChecklist(input: ChecklistInput): ChecklistItem[] {
  return [
    {
      key: "avatar",
      label: "Add a profile photo",
      done: !!input.avatarUrl,
      href: "/admin/profile",
    },
    {
      key: "about",
      label: "Write your About section",
      done: hasRealText(input.aboutMd),
      href: "/admin/profile",
    },
    {
      key: "projects",
      label: `Publish at least ${MIN_PUBLISHED_PROJECTS} projects`,
      done: input.publishedProjects >= MIN_PUBLISHED_PROJECTS,
      href: "/admin/projects",
    },
    {
      key: "resume",
      label: "Upload your résumé",
      done: !!input.resumeUrl,
      href: "/admin/profile#resume",
    },
    {
      key: "social",
      label: "Add a social link",
      done: input.visibleSocialLinks >= 1,
      href: "/admin/social",
    },
    {
      key: "seo",
      label: "Write an SEO description",
      done: hasRealText(input.seoDescription),
      href: "/admin/settings#seo",
    },
  ];
}

export type ResumeStatus =
  { state: "missing" } | { state: "fresh" | "stale"; ageDays: number };

/** Whole days since the résumé was last replaced; stale once it is over 90 days old. */
export function resumeStatus(
  updatedAt: Date | null,
  now: Date = new Date(),
): ResumeStatus {
  if (!updatedAt) return { state: "missing" };
  const ageDays = Math.max(
    0,
    Math.floor((now.getTime() - updatedAt.getTime()) / 86_400_000),
  );
  return { state: ageDays > STALE_RESUME_DAYS ? "stale" : "fresh", ageDays };
}
