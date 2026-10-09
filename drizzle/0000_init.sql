CREATE TYPE "public"."certification_kind" AS ENUM('certification', 'award', 'achievement');--> statement-breakpoint
CREATE TYPE "public"."employment_type" AS ENUM('full_time', 'part_time', 'internship', 'freelance', 'contract', 'volunteer');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."social_platform" AS ENUM('github', 'linkedin', 'leetcode', 'x', 'kaggle', 'medium', 'website', 'email', 'other');--> statement-breakpoint
CREATE TABLE "certifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "certification_kind" NOT NULL,
	"title" varchar(140) NOT NULL,
	"issuer" varchar(100),
	"issued_on" date,
	"credential_url" text,
	"description" varchar(300),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "education" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institution" varchar(120) NOT NULL,
	"degree" varchar(100) NOT NULL,
	"field" varchar(100),
	"start_on" date NOT NULL,
	"end_on" date,
	"is_expected" boolean DEFAULT false NOT NULL,
	"grade" varchar(40),
	"details_md" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "education_details_md_length" CHECK (char_length("education"."details_md") <= 1000),
	CONSTRAINT "education_dates" CHECK ("education"."end_on" is null or "education"."end_on" >= "education"."start_on"),
	CONSTRAINT "education_expected_needs_end" CHECK (not "education"."is_expected" or "education"."end_on" is not null)
);
--> statement-breakpoint
CREATE TABLE "experiences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company" varchar(100) NOT NULL,
	"company_url" text,
	"title" varchar(100) NOT NULL,
	"employment_type" "employment_type" NOT NULL,
	"location" varchar(80),
	"start_on" date NOT NULL,
	"end_on" date,
	"summary_md" text DEFAULT '' NOT NULL,
	"highlights" text[] DEFAULT '{}'::text[] NOT NULL,
	"tech" text[] DEFAULT '{}'::text[] NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "experiences_summary_md_length" CHECK (char_length("experiences"."summary_md") <= 1500),
	CONSTRAINT "experiences_highlights_count" CHECK (cardinality("experiences"."highlights") <= 8),
	CONSTRAINT "experiences_tech_count" CHECK (cardinality("experiences"."tech") <= 15),
	CONSTRAINT "experiences_dates" CHECK ("experiences"."end_on" is null or "experiences"."end_on" >= "experiences"."start_on")
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ip_hash" char(64) NOT NULL,
	"success" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"email" varchar(254) NOT NULL,
	"company" varchar(120),
	"subject" varchar(150),
	"body" text NOT NULL,
	"read_at" timestamp with time zone,
	"archived" boolean DEFAULT false NOT NULL,
	"ip_hash" char(64) NOT NULL,
	"user_agent" varchar(300),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "messages_body_length" CHECK (char_length("messages"."body") between 10 and 5000)
);
--> statement-breakpoint
CREATE TABLE "project_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"url" text NOT NULL,
	"alt" varchar(160) NOT NULL,
	"caption" varchar(200),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(80) NOT NULL,
	"title" varchar(100) NOT NULL,
	"summary" varchar(200) NOT NULL,
	"role" varchar(80),
	"problem_md" text DEFAULT '' NOT NULL,
	"approach_md" text DEFAULT '' NOT NULL,
	"outcome_md" text DEFAULT '' NOT NULL,
	"tech" text[] DEFAULT '{}'::text[] NOT NULL,
	"cover_image_url" text,
	"cover_image_alt" varchar(160),
	"live_url" text,
	"repo_url" text,
	"case_study_url" text,
	"status" "project_status" DEFAULT 'draft' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"started_on" date,
	"ended_on" date,
	"published_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_slug_unique" UNIQUE("slug"),
	CONSTRAINT "projects_slug_format" CHECK ("projects"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "projects_slug_not_reserved" CHECK ("projects"."slug" not in ('new', 'edit', 'admin', 'api')),
	CONSTRAINT "projects_problem_md_length" CHECK (char_length("projects"."problem_md") <= 3000),
	CONSTRAINT "projects_approach_md_length" CHECK (char_length("projects"."approach_md") <= 5000),
	CONSTRAINT "projects_outcome_md_length" CHECK (char_length("projects"."outcome_md") <= 3000),
	CONSTRAINT "projects_tech_count" CHECK (cardinality("projects"."tech") <= 20),
	CONSTRAINT "projects_cover_alt" CHECK ("projects"."cover_image_url" is null or "projects"."cover_image_alt" is not null),
	CONSTRAINT "projects_dates" CHECK ("projects"."ended_on" is null or "projects"."started_on" is null or "projects"."ended_on" >= "projects"."started_on")
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"full_name" varchar(80) NOT NULL,
	"headline" varchar(120) NOT NULL,
	"tagline" varchar(240),
	"location" varchar(80),
	"open_to_work" boolean DEFAULT true NOT NULL,
	"open_to_work_text" varchar(80),
	"about_md" text DEFAULT '' NOT NULL,
	"avatar_url" text,
	"avatar_alt" varchar(160),
	"resume_url" text,
	"resume_updated_at" timestamp with time zone,
	"contact_email" varchar(254) NOT NULL,
	"contact_form_enabled" boolean DEFAULT true NOT NULL,
	"seo_title" varchar(70),
	"seo_description" varchar(160) NOT NULL,
	"og_image_url" text,
	"accent" varchar(20) DEFAULT 'indigo' NOT NULL,
	"session_version" integer DEFAULT 1 NOT NULL,
	"sections" jsonb DEFAULT '[{"key":"about","visible":true},{"key":"projects","visible":true},{"key":"experience","visible":true},{"key":"skills","visible":true},{"key":"education","visible":true},{"key":"certifications","visible":true},{"key":"contact","visible":true}]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "site_settings_singleton" CHECK ("site_settings"."id" = 1),
	CONSTRAINT "site_settings_about_md_length" CHECK (char_length("site_settings"."about_md") <= 4000),
	CONSTRAINT "site_settings_avatar_alt" CHECK ("site_settings"."avatar_url" is null or "site_settings"."avatar_alt" is not null),
	CONSTRAINT "site_settings_accent" CHECK ("site_settings"."accent" in ('indigo', 'blue', 'teal', 'emerald', 'amber', 'rose', 'violet', 'slate')),
	CONSTRAINT "site_settings_sections_array" CHECK (jsonb_typeof("site_settings"."sections") = 'array')
);
--> statement-breakpoint
CREATE TABLE "skill_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(40) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"name" varchar(40) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform" "social_platform" NOT NULL,
	"label" varchar(40),
	"url" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "social_links_other_label" CHECK ("social_links"."platform" <> 'other' or "social_links"."label" is not null)
);
--> statement-breakpoint
ALTER TABLE "project_images" ADD CONSTRAINT "project_images_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_group_id_skill_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."skill_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "login_attempts_ip_hash_created_idx" ON "login_attempts" USING btree ("ip_hash","created_at");--> statement-breakpoint
CREATE INDEX "messages_ip_hash_created_idx" ON "messages" USING btree ("ip_hash","created_at");--> statement-breakpoint
CREATE INDEX "messages_created_idx" ON "messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "project_images_project_sort_idx" ON "project_images" USING btree ("project_id","sort_order");--> statement-breakpoint
CREATE INDEX "projects_status_sort_idx" ON "projects" USING btree ("status","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "skills_group_name_unique" ON "skills" USING btree ("group_id",lower("name"));