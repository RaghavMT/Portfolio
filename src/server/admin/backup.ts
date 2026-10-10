import "server-only";
import { buildBackup, type BackupRow } from "@/lib/admin/backup";
import { db } from "../db/client";
import {
  certifications,
  education,
  experiences,
  messages,
  projectImages,
  projects,
  siteSettings,
  skillGroups,
  skills,
  socialLinks,
} from "../db/schema";

/**
 * Reads every content table in full (hidden, draft and archived rows included) and builds the backup
 * (SPEC §9.11). Call only after `requireAdmin()`. Messages are in the file, so it is private.
 */
export async function readBackup(now: Date = new Date()) {
  const [
    siteSettingsRows,
    socialLinkRows,
    projectRows,
    projectImageRows,
    experienceRows,
    educationRows,
    skillGroupRows,
    skillRows,
    certificationRows,
    messageRows,
  ] = await Promise.all([
    db.select().from(siteSettings),
    db.select().from(socialLinks),
    db.select().from(projects),
    db.select().from(projectImages),
    db.select().from(experiences),
    db.select().from(education),
    db.select().from(skillGroups),
    db.select().from(skills),
    db.select().from(certifications),
    db.select().from(messages),
  ]);
  const rows = (list: object[]) => list as BackupRow[];
  return buildBackup(
    {
      site_settings: rows(siteSettingsRows),
      social_links: rows(socialLinkRows),
      projects: rows(projectRows),
      project_images: rows(projectImageRows),
      experiences: rows(experienceRows),
      education: rows(educationRows),
      skill_groups: rows(skillGroupRows),
      skills: rows(skillRows),
      certifications: rows(certificationRows),
      messages: rows(messageRows),
    },
    now,
  );
}
