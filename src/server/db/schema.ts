// Table definitions only (SPEC §7). Unlike the rest of src/server this file does not import
// 'server-only': drizzle-kit and scripts/seed.ts load it outside Next (Decision Log D12).
// It holds no secrets or queries; the DB connection lives in ./client.ts.
import { sql } from "drizzle-orm";
import {
  boolean,
  char,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { RESERVED_SLUGS } from "../../lib/slug";
import { CERTIFICATION_KINDS } from "../../lib/validation/certification";
import { EMPLOYMENT_TYPES } from "../../lib/validation/experience";
import { PROJECT_STATUSES } from "../../lib/validation/project";
import {
  ACCENTS,
  DEFAULT_SECTIONS,
  type Section,
} from "../../lib/validation/site-settings";
import { SOCIAL_PLATFORMS } from "../../lib/validation/social-link";

// ── Enums ─────────────────────────────────────────────────────────────────────

export const socialPlatform = pgEnum("social_platform", SOCIAL_PLATFORMS);
export const projectStatus = pgEnum("project_status", PROJECT_STATUSES);
export const employmentType = pgEnum("employment_type", EMPLOYMENT_TYPES);
export const certificationKind = pgEnum(
  "certification_kind",
  CERTIFICATION_KINDS,
);

// ── Shared columns (SPEC §7.1) ───────────────────────────────────────────────

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
/** Set by the data layer on every update. */
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());
const sortOrder = () => integer("sort_order").notNull().default(0);
const visible = () => boolean("visible").notNull().default(true);
/** Month-precision date stored as the 1st of the month, read as "YYYY-MM-DD". */
const monthDate = (name: string) => date(name, { mode: "string" });
const markdown = (name: string) => text(name).notNull().default("");
const stringArray = (name: string) =>
  text(name)
    .array()
    .notNull()
    .default(sql`'{}'::text[]`);

const sqlList = (values: readonly string[]) =>
  sql.raw(values.map((v) => `'${v}'`).join(", "));

// ── Tables ────────────────────────────────────────────────────────────────────

export const siteSettings = pgTable(
  "site_settings",
  {
    id: smallint("id").primaryKey().default(1),
    fullName: varchar("full_name", { length: 80 }).notNull(),
    headline: varchar("headline", { length: 120 }).notNull(),
    tagline: varchar("tagline", { length: 240 }),
    location: varchar("location", { length: 80 }),
    openToWork: boolean("open_to_work").notNull().default(true),
    openToWorkText: varchar("open_to_work_text", { length: 80 }),
    aboutMd: markdown("about_md"),
    avatarUrl: text("avatar_url"),
    avatarAlt: varchar("avatar_alt", { length: 160 }),
    resumeUrl: text("resume_url"),
    resumeUpdatedAt: timestamp("resume_updated_at", { withTimezone: true }),
    contactEmail: varchar("contact_email", { length: 254 }).notNull(),
    contactFormEnabled: boolean("contact_form_enabled").notNull().default(true),
    seoTitle: varchar("seo_title", { length: 70 }),
    seoDescription: varchar("seo_description", { length: 160 }).notNull(),
    ogImageUrl: text("og_image_url"),
    accent: varchar("accent", { length: 20 }).notNull().default("indigo"),
    sessionVersion: integer("session_version").notNull().default(1),
    sections: jsonb("sections")
      .$type<Section[]>()
      .notNull()
      .default(DEFAULT_SECTIONS),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("site_settings_singleton", sql`${t.id} = 1`),
    check(
      "site_settings_about_md_length",
      sql`char_length(${t.aboutMd}) <= 4000`,
    ),
    check(
      "site_settings_avatar_alt",
      sql`${t.avatarUrl} is null or ${t.avatarAlt} is not null`,
    ),
    check("site_settings_accent", sql`${t.accent} in (${sqlList(ACCENTS)})`),
    check(
      "site_settings_sections_array",
      sql`jsonb_typeof(${t.sections}) = 'array'`,
    ),
  ],
);

export const socialLinks = pgTable(
  "social_links",
  {
    id: id(),
    platform: socialPlatform("platform").notNull(),
    label: varchar("label", { length: 40 }),
    url: text("url").notNull(),
    sortOrder: sortOrder(),
    visible: visible(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check(
      "social_links_other_label",
      sql`${t.platform} <> 'other' or ${t.label} is not null`,
    ),
  ],
);

export const projects = pgTable(
  "projects",
  {
    id: id(),
    slug: varchar("slug", { length: 80 }).notNull().unique(),
    title: varchar("title", { length: 100 }).notNull(),
    summary: varchar("summary", { length: 200 }).notNull(),
    role: varchar("role", { length: 80 }),
    problemMd: markdown("problem_md"),
    approachMd: markdown("approach_md"),
    outcomeMd: markdown("outcome_md"),
    tech: stringArray("tech"),
    coverImageUrl: text("cover_image_url"),
    coverImageAlt: varchar("cover_image_alt", { length: 160 }),
    liveUrl: text("live_url"),
    repoUrl: text("repo_url"),
    caseStudyUrl: text("case_study_url"),
    status: projectStatus("status").notNull().default("draft"),
    featured: boolean("featured").notNull().default(false),
    startedOn: monthDate("started_on"),
    endedOn: monthDate("ended_on"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    sortOrder: sortOrder(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("projects_slug_format", sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
    check(
      "projects_slug_not_reserved",
      sql`${t.slug} not in (${sqlList(RESERVED_SLUGS)})`,
    ),
    check(
      "projects_problem_md_length",
      sql`char_length(${t.problemMd}) <= 3000`,
    ),
    check(
      "projects_approach_md_length",
      sql`char_length(${t.approachMd}) <= 5000`,
    ),
    check(
      "projects_outcome_md_length",
      sql`char_length(${t.outcomeMd}) <= 3000`,
    ),
    check("projects_tech_count", sql`cardinality(${t.tech}) <= 20`),
    check(
      "projects_cover_alt",
      sql`${t.coverImageUrl} is null or ${t.coverImageAlt} is not null`,
    ),
    check(
      "projects_dates",
      sql`${t.endedOn} is null or ${t.startedOn} is null or ${t.endedOn} >= ${t.startedOn}`,
    ),
    index("projects_status_sort_idx").on(t.status, t.sortOrder),
  ],
);

export const projectImages = pgTable(
  "project_images",
  {
    id: id(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    alt: varchar("alt", { length: 160 }).notNull(),
    caption: varchar("caption", { length: 200 }),
    sortOrder: sortOrder(),
    createdAt: createdAt(),
  },
  (t) => [
    index("project_images_project_sort_idx").on(t.projectId, t.sortOrder),
  ],
);

export const experiences = pgTable(
  "experiences",
  {
    id: id(),
    company: varchar("company", { length: 100 }).notNull(),
    companyUrl: text("company_url"),
    title: varchar("title", { length: 100 }).notNull(),
    employmentType: employmentType("employment_type").notNull(),
    location: varchar("location", { length: 80 }),
    startOn: monthDate("start_on").notNull(),
    endOn: monthDate("end_on"),
    summaryMd: markdown("summary_md"),
    highlights: stringArray("highlights"),
    tech: stringArray("tech"),
    sortOrder: sortOrder(),
    visible: visible(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check(
      "experiences_summary_md_length",
      sql`char_length(${t.summaryMd}) <= 1500`,
    ),
    check(
      "experiences_highlights_count",
      sql`cardinality(${t.highlights}) <= 8`,
    ),
    check("experiences_tech_count", sql`cardinality(${t.tech}) <= 15`),
    check(
      "experiences_dates",
      sql`${t.endOn} is null or ${t.endOn} >= ${t.startOn}`,
    ),
  ],
);

export const education = pgTable(
  "education",
  {
    id: id(),
    institution: varchar("institution", { length: 120 }).notNull(),
    degree: varchar("degree", { length: 100 }).notNull(),
    field: varchar("field", { length: 100 }),
    startOn: monthDate("start_on").notNull(),
    endOn: monthDate("end_on"),
    isExpected: boolean("is_expected").notNull().default(false),
    grade: varchar("grade", { length: 40 }),
    detailsMd: markdown("details_md"),
    sortOrder: sortOrder(),
    visible: visible(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check(
      "education_details_md_length",
      sql`char_length(${t.detailsMd}) <= 1000`,
    ),
    check(
      "education_dates",
      sql`${t.endOn} is null or ${t.endOn} >= ${t.startOn}`,
    ),
    check(
      "education_expected_needs_end",
      sql`not ${t.isExpected} or ${t.endOn} is not null`,
    ),
  ],
);

export const skillGroups = pgTable("skill_groups", {
  id: id(),
  name: varchar("name", { length: 40 }).notNull(),
  sortOrder: sortOrder(),
  visible: visible(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const skills = pgTable(
  "skills",
  {
    id: id(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => skillGroups.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 40 }).notNull(),
    sortOrder: sortOrder(),
    visible: visible(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("skills_group_name_unique").on(
      t.groupId,
      sql`lower(${t.name})`,
    ),
  ],
);

export const certifications = pgTable("certifications", {
  id: id(),
  kind: certificationKind("kind").notNull(),
  title: varchar("title", { length: 140 }).notNull(),
  issuer: varchar("issuer", { length: 100 }),
  issuedOn: monthDate("issued_on"),
  credentialUrl: text("credential_url"),
  description: varchar("description", { length: 300 }),
  sortOrder: sortOrder(),
  visible: visible(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const messages = pgTable(
  "messages",
  {
    id: id(),
    name: varchar("name", { length: 100 }).notNull(),
    email: varchar("email", { length: 254 }).notNull(),
    company: varchar("company", { length: 120 }),
    subject: varchar("subject", { length: 150 }),
    body: text("body").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    archived: boolean("archived").notNull().default(false),
    /** SHA-256(ip + IP_HASH_SALT); the raw IP is never stored. */
    ipHash: char("ip_hash", { length: 64 }).notNull(),
    userAgent: varchar("user_agent", { length: 300 }),
    createdAt: createdAt(),
  },
  (t) => [
    check(
      "messages_body_length",
      sql`char_length(${t.body}) between 10 and 5000`,
    ),
    index("messages_ip_hash_created_idx").on(t.ipHash, t.createdAt),
    index("messages_created_idx").on(t.createdAt),
  ],
);

export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: id(),
    ipHash: char("ip_hash", { length: 64 }).notNull(),
    success: boolean("success").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("login_attempts_ip_hash_created_idx").on(t.ipHash, t.createdAt),
  ],
);

// ── Row types ─────────────────────────────────────────────────────────────────

export type SiteSettings = typeof siteSettings.$inferSelect;
export type SocialLink = typeof socialLinks.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type ProjectImage = typeof projectImages.$inferSelect;
export type Experience = typeof experiences.$inferSelect;
export type Education = typeof education.$inferSelect;
export type SkillGroup = typeof skillGroups.$inferSelect;
export type Skill = typeof skills.$inferSelect;
export type Certification = typeof certifications.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type LoginAttempt = typeof loginAttempts.$inferSelect;
