// One-time starter content (SPEC §7.4): inserts content/seed.json only when site_settings is empty.
// Safe to re-run: it never overwrites real content. Run with `pnpm db:seed`.
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { count } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { drizzle } from "drizzle-orm/neon-http";
import { z } from "zod";
import { certificationSchema } from "../src/lib/validation/certification";
import { educationSchema } from "../src/lib/validation/education";
import { experienceSchema } from "../src/lib/validation/experience";
import { projectSchema } from "../src/lib/validation/project";
import { siteSettingsSchema } from "../src/lib/validation/site-settings";
import { skillGroupSchema } from "../src/lib/validation/skill";
import { socialLinkSchema } from "../src/lib/validation/social-link";
import * as schema from "../src/server/db/schema";

const seedSchema = z.object({
  siteSettings: siteSettingsSchema,
  socialLinks: z.array(socialLinkSchema).default([]),
  projects: z.array(projectSchema).default([]),
  experiences: z.array(experienceSchema).default([]),
  education: z.array(educationSchema).default([]),
  skillGroups: z
    .array(skillGroupSchema.extend({ skills: z.array(z.string()).default([]) }))
    .default([]),
  certifications: z.array(certificationSchema).default([]),
});

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const url = process.env.DATABASE_URL;
if (!url) {
  console.error(
    "[seed] DATABASE_URL is not set. Run `vercel env pull .env.local`.",
  );
  process.exit(1);
}

const parsed = seedSchema.safeParse(
  JSON.parse(readFileSync("content/seed.json", "utf8")),
);
if (!parsed.success) {
  console.error(
    "[seed] content/seed.json is invalid:\n" + z.prettifyError(parsed.error),
  );
  process.exit(1);
}
const seed = parsed.data;
const db = drizzle({ client: neon(url), schema });

const [{ rows }] = await db.select({ rows: count() }).from(schema.siteSettings);
if (rows > 0) {
  console.info(
    "[seed] already seeded (site_settings has a row); nothing changed",
  );
  process.exit(0);
}

const now = new Date();
const withOrder = <T>(items: T[]) =>
  items.map((item, sortOrder) => ({ ...item, sortOrder }));
const groups = seed.skillGroups.map(({ skills, ...group }, sortOrder) => ({
  group: { ...group, id: randomUUID(), sortOrder },
  skills,
}));
const skillRows = groups.flatMap(({ group, skills }) =>
  skills.map((name, sortOrder) => ({ groupId: group.id, name, sortOrder })),
);
const projectRows = withOrder(seed.projects).map((p) => ({
  ...p,
  publishedAt: p.status === "published" ? now : null,
}));

// One batch = one transaction: either everything is inserted or nothing is. The site_settings
// primary key (id = 1) also makes a concurrent second run fail instead of duplicating content.
// drizzle rejects inserts with no rows, so empty lists are skipped.
const queries: [BatchItem<"pg">, ...BatchItem<"pg">[]] = [
  db.insert(schema.siteSettings).values({ id: 1, ...seed.siteSettings }),
];
if (seed.socialLinks.length)
  queries.push(
    db.insert(schema.socialLinks).values(withOrder(seed.socialLinks)),
  );
if (projectRows.length)
  queries.push(db.insert(schema.projects).values(projectRows));
if (seed.experiences.length)
  queries.push(
    db.insert(schema.experiences).values(withOrder(seed.experiences)),
  );
if (seed.education.length)
  queries.push(db.insert(schema.education).values(withOrder(seed.education)));
if (groups.length)
  queries.push(
    db.insert(schema.skillGroups).values(groups.map((g) => g.group)),
  );
if (skillRows.length) queries.push(db.insert(schema.skills).values(skillRows));
if (seed.certifications.length) {
  queries.push(
    db.insert(schema.certifications).values(withOrder(seed.certifications)),
  );
}
await db.batch(queries);

console.info(
  `[seed] ok: 1 site_settings, ${seed.socialLinks.length} social links, ${projectRows.length} projects, ` +
    `${seed.experiences.length} experiences, ${seed.education.length} education, ${groups.length} skill groups, ` +
    `${skillRows.length} skills, ${seed.certifications.length} certifications`,
);
