import "server-only";
import { asc, desc } from "drizzle-orm";
import { db } from "../db/client";
import {
  certifications,
  education,
  experiences,
  socialLinks,
} from "../db/schema";

/**
 * Admin reads (SPEC §14.1): every row, hidden and draft included, uncached. Only call these from
 * admin pages that already passed `requireAdminPage()`. Order matches the public site (§7.1).
 */

export function listSocialLinks() {
  return db
    .select()
    .from(socialLinks)
    .orderBy(asc(socialLinks.sortOrder), desc(socialLinks.createdAt));
}

export type AdminSocialLink = Awaited<
  ReturnType<typeof listSocialLinks>
>[number];

export function listCertifications() {
  return db
    .select()
    .from(certifications)
    .orderBy(asc(certifications.sortOrder), desc(certifications.createdAt));
}
export type AdminCertification = Awaited<
  ReturnType<typeof listCertifications>
>[number];

export function listEducation() {
  return db
    .select()
    .from(education)
    .orderBy(asc(education.sortOrder), desc(education.createdAt));
}
export type AdminEducation = Awaited<ReturnType<typeof listEducation>>[number];

export function listExperiences() {
  return db
    .select()
    .from(experiences)
    .orderBy(asc(experiences.sortOrder), desc(experiences.createdAt));
}
export type AdminExperience = Awaited<
  ReturnType<typeof listExperiences>
>[number];
