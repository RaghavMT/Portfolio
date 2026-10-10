# SPEC — Raghav Tibra Portfolio + Admin CMS

| Field | Value |
|---|---|
| Document | `SPEC.md` — single source of truth for this project |
| Owner | Raghav Tibra (raghav.tibra@ivtics.com) |
| Status | **Draft v1.0** — awaiting answers to §17 Open Questions |
| Last updated | 2026-10-08 |
| Target platform | Vercel (Hobby plan, free) |
| Primary goal | Get hired: a fast, credible portfolio that Raghav can update himself, without touching code |

> **Read this first (for humans and AI agents).**
> This is a *spec-driven* project. Code is written **from this document, phase by phase** (§15).
> If the code and the spec disagree, the spec wins — or the spec is updated first, in the same change, with a line in the Decision Log (§18).
> Anything not described here is **out of scope** until it is added here.

---

## Table of contents

1. Context & problem
2. Goals, non-goals & success metrics
3. Users & roles
4. Glossary
5. System overview & architecture
6. Tech stack (pinned) & dependency policy
7. Data model
8. Public site — functional requirements
9. Admin panel — functional requirements
10. Uploads & media
11. Contact form
12. Security requirements
13. Non-functional requirements (performance, a11y, SEO, reliability)
14. Project structure, conventions & coding rules
15. Delivery plan — phases, tasks, acceptance criteria
16. Testing strategy & Definition of Done
17. Open questions (Raghav to answer)
18. Decision log
19. **Guardrails for AI coding agents** (must-read)
20. Runbook — setup, deploy, everyday use, recovery
21. Appendix — env vars, free-tier limits, references

---

## 1. Context & problem

Raghav wants a personal portfolio website to **get hired**. Recruiters and hiring managers should, within ~30 seconds, understand *who he is, what he can do, and proof that he can do it* (projects), and be able to contact him or download his resume.

**The core constraint:** Raghav does not want to edit frontend code for every change, and paying a developer or an AI agent for each small edit (add a project, fix a typo, swap the resume) is slow and costly.

**Therefore:** the site ships with a **private admin panel** (`/admin`) — a simple CMS — where Raghav can add, edit, hide, reorder and delete *every* piece of content on the site via forms. Saving in the admin updates the live site within seconds, **with no redeploy and no code change**.

Code changes should only be needed for *new kinds* of features or design changes — never for content.

## 2. Goals, non-goals & success metrics

### 2.1 Goals (MVP)

| ID | Goal |
|---|---|
| G1 | A professional, responsive, fast public portfolio (hero, about, projects, experience, skills, education, certifications, contact, resume). |
| G2 | Every visible piece of content on the public site is editable from `/admin` — no hard-coded personal content in components. |
| G3 | Full CRUD for projects via a form, including cover image, gallery images, tech tags, links, draft/published, featured, and ordering. |
| G4 | Content changes appear on the live site in ≤ 5 seconds after saving, without a redeploy. |
| G5 | Admin is protected by a single-owner login that is secure by default. |
| G6 | Runs entirely on free tiers (Vercel Hobby + Neon Free + Vercel Blob Hobby + optional Resend Free). |
| G7 | A non-developer can operate it day-to-day using only the admin panel and the runbook (§20). |

### 2.2 Non-goals (explicitly out of scope for MVP)

- Multiple admin users, roles, or sign-up. There is exactly **one** admin: Raghav.
- A blog / long-form writing section (candidate for v2 — see §15 Phase 9).
- Visual page builder / drag-and-drop layout editing. Admin edits **content**, not layout. (It *can* toggle and reorder whole sections.)
- Comments, likes, newsletters, payments, i18n/multiple languages.
- Third-party CMS (Sanity, Contentful, Strapi, etc.). The CMS is built in.
- Native mobile apps.

### 2.3 Success metrics

| Metric | Target |
|---|---|
| Lighthouse (mobile) on `/` and `/projects/[slug]` | Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 95 |
| Time to add a new project end-to-end in admin (with images) | ≤ 3 minutes |
| Code changes needed for content edits | **Zero** |
| Monthly cost | ₹0 (excluding optional custom domain, ~₹800–1,000/yr) |
| Content-edit → visible on live site | ≤ 5 s |

## 3. Users & roles

| Role | Who | Can do | Auth |
|---|---|---|---|
| **Visitor** | Recruiters, hiring managers, peers | View published content, download resume, send a contact message | None |
| **Admin** | Raghav only | Everything in `/admin`: create/read/update/delete all content, upload files, read messages, change settings, export backup | Password login → signed session cookie |

There is no "editor" or "viewer" role. Do not build role systems.

## 4. Glossary

| Term | Meaning |
|---|---|
| **Content** | Any data shown on the public site (text, images, links, resume). Lives in the database / Blob, never in code. |
| **Entity** | A content type with its own table: Project, Experience, Education, Skill, SkillGroup, Certification, SocialLink, Message. |
| **Profile / Settings** | Singleton (exactly one row) holding name, headline, about, avatar, resume, SEO, section visibility/order, theme. |
| **Published / Draft** | Projects have a `status`. Only `published` projects are visible publicly. Other entities use a `visible` boolean. |
| **Featured** | A published project flagged to appear on the home page. |
| **Slug** | URL-safe identifier for a project, e.g. `smart-attendance-system` → `/projects/smart-attendance-system`. |
| **Revalidation** | Telling Next.js that cached public pages are stale so the next request shows fresh content. |
| **Blob** | A file stored in Vercel Blob (images, resume PDF). |
| **Server Action** | A Next.js server function called from a form. All admin mutations use these. |

## 5. System overview & architecture

### 5.1 One app, two faces

A **single Next.js application** deployed to Vercel contains both:

- the **public site** (`/`, `/projects`, `/projects/[slug]`, `/resume`), and
- the **admin panel** (`/admin/**`), plus a small number of route handlers (`/api/**`).

There is no separate backend server. "Backend" = Next.js Server Components, Server Actions and Route Handlers running as Vercel Functions.

### 5.2 Diagram

```
                ┌──────────────────────────── Vercel ────────────────────────────┐
 Visitor ──────▶│  Public pages (Server Components, cached, tag: "content")       │
                │        │ read                                                   │
                │        ▼                                                        │
                │  Data layer  src/server/queries/*  ──────────▶  Neon Postgres   │
                │        ▲                                         (Drizzle ORM)  │
                │        │ write + invalidate cache                               │
 Raghav ───────▶│  /admin (behind proxy.ts gate + requireAdmin() in every action) │
   (browser)    │        │                                                        │
                │        │ 1. ask for upload token  ─▶ /api/upload (auth-checked) │
                │        │ 2. upload file directly  ─────────────▶  Vercel Blob   │
                │        │ 3. save returned URL via Server Action                 │
                │                                                                 │
 Visitor ──────▶│  Contact form ─▶ Server Action ─▶ messages table (+ optional    │
                │                                    email via Resend)            │
                └─────────────────────────────────────────────────────────────────┘
```

### 5.3 Key architectural decisions (summary — details in §18)

1. **Database-backed CMS, not Git-based.** Edits are instant and don't trigger rebuilds.
2. **Neon Postgres** (via Vercel Marketplace) + **Drizzle ORM**. Typed schema, SQL migrations checked into git.
3. **Vercel Blob (public store)** for images and resume, using **client uploads** (bypasses Vercel's 4.5 MB function body limit and avoids paying transfer twice).
4. **Single-owner password auth** with a bcrypt hash in an env var and a signed, httpOnly JWT session cookie (via `jose`). No auth provider, no user table.
5. **Cached public pages + on-save invalidation.** Public pages are static/cached; every admin mutation invalidates the `content` cache tag (or the root layout path). Visitors almost never hit the database directly — this also hides Neon's scale-to-zero cold start.
6. **Server Actions + Zod** for every write. Validation runs on the server, always.

## 6. Tech stack (pinned) & dependency policy

### 6.1 Stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | **Next.js 16.x** (App Router), React 19.x | Use latest 16.x patch at build time. As of 2026‑10 the current line is 16.4; security LTS releases exist for 16.3 — **always take the latest security patch.** |
| Language | **TypeScript**, `strict: true` | No `any` without a `// reason:` comment. |
| Styling | **Tailwind CSS v4** | Design tokens as CSS variables (§8.9). No other CSS frameworks. |
| UI primitives | **shadcn/ui** (copied into `src/components/ui`) on Radix | Admin forms, dialogs, toasts, dropdowns. Public site may use them sparingly. |
| Icons | `lucide-react` | |
| DB | **Neon Postgres** (Free plan) | Created from Vercel → Storage → Marketplace so `DATABASE_URL` is auto-injected. |
| ORM / migrations | **drizzle-orm** + **drizzle-kit**, driver `@neondatabase/serverless` (`neon-http`) | Migrations in `drizzle/` committed to git. |
| Validation | **zod** | One schema per entity, shared by form (client) and action (server). |
| Forms | `react-hook-form` + `@hookform/resolvers/zod` | |
| File storage | **@vercel/blob** (public store), client uploads | |
| Auth | `bcryptjs` (hash verify) + `jose` (JWT sign/verify) | No NextAuth/Auth.js/Clerk — overkill for one user. |
| Markdown | `react-markdown` + `remark-gfm` | **Never** add `rehype-raw`. Raw HTML must not render. |
| Drag-to-reorder | `@dnd-kit/core` + `@dnd-kit/sortable` | Must also offer keyboard-accessible ↑/↓ buttons. |
| Toasts | `sonner` (via shadcn) | |
| Email (optional) | `resend` | Only if `RESEND_API_KEY` set; otherwise messages are stored only. |
| Analytics (optional) | `@vercel/analytics`, `@vercel/speed-insights` | Cookieless; free on Hobby within limits. |
| Unit tests | **Vitest** | |
| E2E tests | **Playwright** | |
| Lint/format | ESLint (next config) + Prettier | |
| Package manager | **pnpm** | Lockfile committed. Node 22 LTS or newer. |

### 6.2 Dependency policy

- The list above is the **allow-list**. Adding *any* other runtime dependency requires: (a) a one-line justification in the PR/commit, (b) a Decision Log entry (§18), and (c) Raghav's OK.
- Prefer platform features (Next.js, React, Web APIs) over libraries.
- Never add a dependency to do something achievable in < 30 lines of clear code.
- No packages with known critical CVEs (`pnpm audit --prod` must be clean of critical/high before deploy).

### 6.3 Version-specific notes (Next.js 16)

- Request interception lives in **`proxy.ts`** (renamed from `middleware.ts` in Next 16; export a function named `proxy`; runs on the Node.js runtime).
- `params` / `searchParams` / `cookies()` / `headers()` are **async** — always `await` them.
- Turbopack is the default bundler.
- Caching: if the project is created with **Cache Components** enabled (default in `create-next-app` ≥ 16.4), use `'use cache'` + `cacheTag('content')` on public data functions and `updateTag('content')` inside admin Server Actions. If not enabled, use `revalidatePath('/', 'layout')` after each mutation. **Pick one approach, record it in §18, and use it everywhere.**
- Before using any Next.js API, check the docs that ship with the installed version (`node_modules/next/dist/docs` / the `AGENTS.md` that `create-next-app` generates). Do not rely on memory of older versions (e.g. Pages Router, `getServerSideProps`, `next/legacy/image` are forbidden).

## 7. Data model

### 7.1 Conventions

- Table names: `snake_case`, plural. Column names: `snake_case`. TypeScript: `camelCase` (Drizzle maps).
- Primary keys: `id uuid primary key default gen_random_uuid()` (except the singleton, see below).
- Every table has `created_at timestamptz not null default now()` and `updated_at timestamptz not null default now()`; `updated_at` is set by the data layer on every update.
- Ordering: every list entity has `sort_order integer not null default 0`. Lists render `ORDER BY sort_order ASC, created_at DESC`.
- Visibility: list entities have `visible boolean not null default true`. Projects use `status` instead.
- Dates that are "month precision" (job start, graduation) are stored as `date` set to the 1st of the month; UI shows "Mon YYYY".
- Text limits below are **enforced in Zod and in the DB** (`varchar(n)` or `check`).
- URLs are validated as `https://` (or `mailto:` where stated). `http://` and `javascript:` are rejected.

### 7.2 Tables

#### `site_settings` (singleton — exactly one row, `id = 1`)

| Column | Type | Rules |
|---|---|---|
| id | smallint PK | `check (id = 1)` |
| full_name | varchar(80) | required |
| headline | varchar(120) | required. e.g. "Software Engineer · Full‑stack & Data" |
| tagline | varchar(240) | optional one-liner under the headline |
| location | varchar(80) | optional, e.g. "Bengaluru, India" |
| open_to_work | boolean | default `true`; shows an "Open to opportunities" badge |
| open_to_work_text | varchar(80) | optional, e.g. "Open to SDE‑1 roles from Jan 2027" |
| about_md | text | Markdown, ≤ 4,000 chars |
| avatar_url / avatar_alt | text / varchar(160) | Blob URL; alt required if url set |
| resume_url | text | Blob URL to PDF, nullable |
| resume_updated_at | timestamptz | set when resume replaced |
| contact_email | varchar(254) | required; shown as mailto and used as email destination |
| contact_form_enabled | boolean | default `true` |
| seo_title | varchar(70) | default `"{full_name} — {headline}"` |
| seo_description | varchar(160) | required |
| og_image_url | text | optional; if null, auto-generated OG image is used |
| accent | varchar(20) | one of a fixed preset list (§8.9), default `"indigo"` |
| session_version | integer | default `1`; bumped by "Log out of all devices" (§12.1) |
| sections | jsonb | ordered array of `{ key, visible }` — see §7.3 |
| updated_at | timestamptz | |

#### `social_links`

| Column | Type | Rules |
|---|---|---|
| id, sort_order, visible, created_at, updated_at | | standard |
| platform | varchar(20) | enum: `github`, `linkedin`, `leetcode`, `x`, `kaggle`, `medium`, `website`, `email`, `other` |
| label | varchar(40) | required when `platform = other` |
| url | text | https URL (or `mailto:` for `email`) |

#### `projects`

| Column | Type | Rules |
|---|---|---|
| id, sort_order, created_at, updated_at | | standard |
| slug | varchar(80) unique | `^[a-z0-9]+(?:-[a-z0-9]+)*$`; auto-generated from title, editable; reserved: `new`, `edit`, `admin`, `api` |
| title | varchar(100) | required |
| summary | varchar(200) | required; shown on cards |
| role | varchar(80) | optional, e.g. "Solo project", "Backend lead (team of 4)" |
| problem_md | text | ≤ 3,000 chars — what problem / why |
| approach_md | text | ≤ 5,000 chars — what you built and how |
| outcome_md | text | ≤ 3,000 chars — results, metrics, learnings |
| tech | text[] | 0–20 tags, each ≤ 30 chars, trimmed, de-duplicated case-insensitively |
| cover_image_url / cover_image_alt | text / varchar(160) | alt required when image set |
| live_url | text | optional https |
| repo_url | text | optional https |
| case_study_url | text | optional https (e.g. blog/Notion/PDF) |
| status | enum `draft` \| `published` | default `draft` |
| featured | boolean | default `false`; only `published` projects can be shown as featured |
| started_on / ended_on | date | optional; `ended_on ≥ started_on`; null `ended_on` = "Ongoing" |
| published_at | timestamptz | set first time status → published |

#### `project_images` (gallery)

| Column | Type | Rules |
|---|---|---|
| id, sort_order, created_at | | standard |
| project_id | uuid FK → projects.id **on delete cascade** | |
| url | text | Blob URL |
| alt | varchar(160) | required |
| caption | varchar(200) | optional |

Max 12 images per project (enforced in action).

#### `experiences`

| Column | Type | Rules |
|---|---|---|
| id, sort_order, visible, created_at, updated_at | | standard |
| company | varchar(100) | required |
| company_url | text | optional https |
| title | varchar(100) | required, e.g. "Software Engineering Intern" |
| employment_type | enum | `full_time`, `part_time`, `internship`, `freelance`, `contract`, `volunteer` |
| location | varchar(80) | optional ("Remote" allowed) |
| start_on | date | required |
| end_on | date | nullable → "Present" |
| summary_md | text | ≤ 1,500 chars |
| highlights | text[] | 0–8 bullets, each ≤ 200 chars (impact statements) |
| tech | text[] | 0–15 tags |

#### `education`

| Column | Type | Rules |
|---|---|---|
| id, sort_order, visible, created_at, updated_at | | standard |
| institution | varchar(120) | required |
| degree | varchar(100) | required, e.g. "B.Tech" |
| field | varchar(100) | optional, e.g. "Computer Science" |
| start_on / end_on | date | end nullable → "Expected {Mon YYYY}" if `is_expected` |
| is_expected | boolean | default false |
| grade | varchar(40) | optional, e.g. "CGPA 8.6/10" |
| details_md | text | ≤ 1,000 chars (coursework, activities) |

#### `skill_groups` and `skills`

`skill_groups`: id, name varchar(40) (e.g. "Languages", "Frameworks", "Data & ML", "Tools"), sort_order, visible, timestamps.
`skills`: id, group_id FK → skill_groups.id **on delete cascade**, name varchar(40), sort_order, visible, timestamps. Unique `(group_id, lower(name))`.

No "skill level" bars or percentages (recruiters distrust them) — deliberate decision, see §18.

#### `certifications` (also used for awards / achievements)

| Column | Type | Rules |
|---|---|---|
| id, sort_order, visible, created_at, updated_at | | standard |
| kind | enum | `certification`, `award`, `achievement` |
| title | varchar(140) | required |
| issuer | varchar(100) | optional |
| issued_on | date | optional |
| credential_url | text | optional https |
| description | varchar(300) | optional |

#### `messages` (contact form inbox)

| Column | Type | Rules |
|---|---|---|
| id, created_at | | standard |
| name | varchar(100) | required |
| email | varchar(254) | required, valid email |
| company | varchar(120) | optional |
| subject | varchar(150) | optional |
| body | text | 10–5,000 chars |
| read_at | timestamptz | null = unread |
| archived | boolean | default false |
| ip_hash | char(64) | SHA‑256(ip + `IP_HASH_SALT`) — never store raw IP |
| user_agent | varchar(300) | truncated |

#### `login_attempts` (rate limiting)

id, ip_hash char(64), success boolean, created_at. Index on `(ip_hash, created_at)`. Rows older than 30 days are deleted opportunistically on each login attempt.

#### `contact_rate` — not a table. Contact-form rate limiting reuses `messages.ip_hash` + `created_at` (count recent rows).

### 7.3 `site_settings.sections` shape

```json
[
  { "key": "about",          "visible": true },
  { "key": "projects",       "visible": true },
  { "key": "experience",     "visible": true },
  { "key": "skills",         "visible": true },
  { "key": "education",      "visible": true },
  { "key": "certifications", "visible": true },
  { "key": "contact",        "visible": true }
]
```

- `key` ∈ the fixed set above; each key appears **exactly once** (Zod enforces).
- Array order = render order on the home page. The **hero is always first** and the **footer always last** — not configurable.
- A visible section with zero visible items is **not rendered** (no empty headings), except `contact` which always renders if visible.

### 7.4 Migrations & seed

- Schema lives in `src/server/db/schema.ts`. Migrations are generated with `drizzle-kit generate` and committed in `drizzle/`.
- **Only additive migrations** are allowed without Raghav's explicit approval (add table/column/index). Renames, drops, and type changes that can lose data require: a backup export (§9.11) first, a Decision Log entry, and approval.
- Migrations run via `pnpm db:migrate`. On Vercel, the build command runs `pnpm db:migrate && next build` **only when `VERCEL_ENV === "production"`** (script: `scripts/migrate.ts` exits 0 without migrating otherwise).
- `pnpm db:seed` inserts the `site_settings` row and starter content from `content/seed.json` **only if `site_settings` is empty** (idempotent; never overwrites real content).
- `content/seed.json` holds Raghav's real starting content (from his resume). It is the *only* place personal content may appear in the repo, and it is used once.

## 8. Public site — functional requirements

### 8.1 Routes

| Route | Purpose | Rendering |
|---|---|---|
| `/` | Home: hero + configurable sections (§7.3) | Cached, invalidated on content change |
| `/projects` | All published projects, filterable by tech tag | Cached |
| `/projects/[slug]` | Project case study | Cached; `generateStaticParams` for published slugs; unknown/draft slug → 404 |
| `/resume` | 302 redirect to current `resume_url`; 404 page with contact link if none | Dynamic |
| `/sitemap.xml`, `/robots.txt` | `app/sitemap.ts`, `app/robots.ts` | Cached |
| `/opengraph-image` | Auto OG image (name + headline + accent) via `next/og` | Cached |
| `not-found`, `error` | Friendly 404 / error pages with link home | — |

`/admin/**` and `/api/**` are disallowed in `robots.txt` and carry `noindex`.

### 8.2 Hero (FR-PUB-01)
- Shows `full_name`, `headline`, `tagline`, `location`, avatar (if set), "Open to opportunities" badge + text (if `open_to_work`).
- Primary CTA: **"View projects"** (scrolls to projects). Secondary CTA: **"Download resume"** (→ `/resume`, hidden if no resume). Tertiary: social icons (visible `social_links`, in order).
- Above the fold on a 375×667 phone: name, headline and both CTAs must be visible without scrolling.

### 8.3 About (FR-PUB-02)
- Renders `about_md` as sanitized Markdown (GFM: bold, italics, links, lists). Links open in same tab except external (`target="_blank" rel="noopener noreferrer"`).

### 8.4 Projects (FR-PUB-03)
- Home shows **featured** published projects (max 6), ordered by `sort_order`. If none featured, show the first 3 published. "See all projects →" link to `/projects` when there are more.
- Card: cover image (16:9, `next/image`, lazy except first card), title, summary, up to 5 tech tags (+N), links (Live / Code) as icon buttons with accessible labels. Whole card links to the case study.
- `/projects`: grid of all published projects; tag filter chips built from the union of tags; filter state in the URL (`?tag=react`) so it's shareable; works without JS (links, not buttons).
- `/projects/[slug]`: title, summary, role, dates, tech tags, links, cover, sections **Problem / Approach / Outcome** (each only if non-empty), gallery (lightbox optional, keyboard accessible), "Next / Previous project" navigation, back link.
- Each project page has its own `<title>`, meta description (= summary), canonical URL and OG image (= cover, else default).

### 8.5 Experience (FR-PUB-04)
- Timeline/list, most relevant first (by `sort_order`). Shows title, company (linked if URL), type badge, location, "Mon YYYY – Mon YYYY / Present", duration (e.g. "6 mos"), summary, highlights as bullets, tech tags.

### 8.6 Skills (FR-PUB-05)
- Grouped chips by `skill_groups`. No progress bars/percentages.

### 8.7 Education & Certifications (FR-PUB-06)
- Education entries as compact cards. Certifications/awards list with issuer, date, and "View credential" link if present.

### 8.8 Contact (FR-PUB-07)
- Shows `contact_email` (mailto), social links, and — if `contact_form_enabled` — the contact form (§11).

### 8.9 Visual design & theming (FR-PUB-08)
- Clean, minimal, content-first; generous whitespace; max content width ~ 1100 px; system font stack or **one** variable font via `next/font` (Inter or Geist).
- **Light and dark mode**, following `prefers-color-scheme`, with a manual toggle (choice remembered in `localStorage`, wrapped in try/catch; no flash of wrong theme).
- Tokens as CSS variables in `globals.css`: `--bg`, `--fg`, `--muted`, `--border`, `--card`, `--accent`, `--accent-fg`, radius & spacing scale.
- `accent` preset list (admin-selectable): `indigo`, `blue`, `teal`, `emerald`, `amber`, `rose`, `violet`, `slate`. Each preset defines light and dark values that pass **WCAG AA contrast** against `--bg`. No free-form color picker (prevents unreadable combos).
- Subtle motion only (≤ 200 ms fades/translates); respect `prefers-reduced-motion`.
- No stock-photo hero banners, no auto-playing media, no typewriter effects, no custom cursors.

### 8.10 Footer
- "© {year} {full_name}", social icons, "Last updated {Mon YYYY}" (max `updated_at` across content). No admin link in the footer.

## 9. Admin panel — functional requirements

### 9.1 General UX rules (apply to every admin screen)

- **Layout:** left sidebar (collapsible to a top menu on mobile) with: Dashboard, Profile, Projects, Experience, Education, Skills, Certifications, Social links, Messages (unread count badge), Settings, *View site ↗*, Log out.
- **Forms:** built with react-hook-form + the entity's Zod schema; inline field errors; required fields marked; character counters on limited fields; helper text explaining *what recruiters want to see* (e.g. "Start highlights with a verb and include a number").
- **Save feedback:** buttons show pending state and are disabled while saving; success → toast "Saved — live on your site"; failure → toast with a human-readable message, and the form keeps its values (never lose user input).
- **Unsaved changes:** navigating away from a dirty form shows a confirm prompt.
- **Delete:** always via a confirmation dialog naming the item. Deleting a **project** requires typing the project title. Deletions also delete owned Blob files (§10.4).
- **Reorder:** drag handle *and* ↑/↓ buttons; order saves automatically (debounced 500 ms) with a toast.
- **Visibility:** an eye toggle on each list row flips `visible` (or Draft/Published for projects) instantly.
- **Markdown fields:** textarea with **Write / Preview** tabs using the same renderer as the public site.
- **Empty states:** every list has a friendly empty state with a primary "Add …" button.
- **Mobile-usable:** all admin screens usable at 375 px width.
- **Every admin page** sets `robots: noindex, nofollow` and is excluded from the sitemap.

### 9.2 Login — `/admin/login` (FR-ADM-01)
- Single password field (+ show/hide). No username. No "forgot password" (recovery is via env var — §20.5).
- On success → redirect to the originally requested admin URL (validated to start with `/admin`) or `/admin`.
- On failure → generic "Incorrect password" message; rate-limited (§12.2).
- Already logged in → redirect to `/admin`.

### 9.3 Dashboard — `/admin` (FR-ADM-02)
- Cards: # published projects / drafts, unread messages, resume last updated (warn if > 90 days), "Profile completeness" checklist (avatar, about, ≥ 3 published projects, resume, ≥ 1 social link, SEO description) each linking to the right form.
- Quick actions: **+ New project**, **Replace resume**, **View site**.

### 9.4 Profile — `/admin/profile` (FR-ADM-03)
- Edits: full name, headline, tagline, location, open-to-work toggle + text, about (Markdown), avatar (upload/replace/remove + alt), contact email.
- **Resume** sub-section: upload PDF (replaces old; old blob deleted after successful save), shows filename, size, last updated, "Open current resume" link.

### 9.5 Projects — `/admin/projects`, `/admin/projects/new`, `/admin/projects/[id]` (FR-ADM-04)
- **List:** rows with thumbnail, title, status pill (Draft/Published), featured star, updated date; filters: All / Published / Drafts; search by title; reorder; quick toggles (publish, feature); actions: Edit, View on site (published only), Duplicate, Delete.
- **Form (new & edit):** the "push a new project" form Raghav asked for. Fields in this order:
  1. Title* → auto-fills slug (editable; uniqueness checked on blur and on save)
  2. Summary* (200)
  3. Role
  4. Dates (started, ended / "Ongoing" checkbox)
  5. Tech tags (type + Enter; comma also splits; suggestions from existing tags; drag to reorder)
  6. Links: Live, Repository, Case study
  7. Cover image (drag-drop or pick; preview; alt text*)
  8. Problem / Approach / Outcome (Markdown with preview; collapsible)
  9. Gallery (multi-upload, alt per image*, caption, reorder, remove)
  10. Status: Draft / Published; Featured toggle
- Buttons: **Save draft**, **Publish** (validates stricter rules: cover image + alt required, ≥ 1 tech tag, summary present), **Preview** (opens `/admin/preview/projects/[id]` — renders the public project template for a draft, admin-only, noindex).
- Changing the slug of a published project shows a warning ("old links will break").
- **Duplicate** creates a copy titled "Copy of …", status draft, new slug, *no* images (to avoid shared blob ownership).

### 9.6 Experience, Education, Certifications, Social links (FR-ADM-05)
- Same pattern: list (reorder, visibility toggle, edit, delete) + form in a side sheet or dedicated page. Fields per §7.2.
- Experience "highlights": add/remove/reorder bullet inputs (max 8).

### 9.7 Skills (FR-ADM-06)
- Groups as cards; inside each card, skill chips with add (type + Enter), remove (×), reorder. Groups themselves reorderable, renamable, hideable, deletable (confirm: "deletes N skills").

### 9.8 Messages — `/admin/messages` (FR-ADM-07)
- Inbox list: unread bold, name, email, subject/first line, relative time. Filters: Inbox / Archived. Open → full message; marks read. Actions: Reply (opens `mailto:` with subject "Re: …"), Mark unread, Archive, Delete.

### 9.9 Settings — `/admin/settings` (FR-ADM-08)
- **Sections:** reorder home-page sections and toggle visibility (§7.3).
- **Appearance:** accent preset picker with live swatch preview.
- **SEO:** SEO title, description (counters), OG image upload (optional) with preview of how the link will look when shared.
- **Contact form:** enable/disable.
- **Backup:** *Export all content* (§9.11).
- **Session:** "Log out of all devices" (rotates session version, §12.1).

### 9.10 Draft preview (FR-ADM-09)
- `/admin/preview/projects/[id]` renders exactly what `/projects/[slug]` would, with a sticky banner "Preview — not public". Protected like all admin routes.

### 9.11 Backup export (FR-ADM-10)
- Settings → "Download backup" returns `portfolio-backup-YYYY-MM-DD.json` containing all tables except `login_attempts`, plus a list of Blob URLs. Import is **not** in MVP (manual via script if ever needed).

### 9.12 Cache invalidation contract (FR-ADM-11)
- **Every** successful content mutation (create/update/delete/reorder/visibility/settings) invalidates the public cache using the single approach chosen in §6.3, *after* the DB write succeeds.
- Acceptance: after saving, opening the public page in a private window shows the change within 5 s.
## 10. Uploads & media

### 10.1 Flow (client upload — mandatory)
1. Admin picks a file in the browser. Client-side checks type and size first (fast feedback).
2. Browser calls `upload()` from `@vercel/blob/client`, which requests a token from **`/api/upload`**.
3. `/api/upload` uses `handleUpload()`; in `onBeforeGenerateToken` it **must**:
   - verify the admin session (same check as `requireAdmin()`); reject with 401 otherwise;
   - read the declared `kind` from the client payload (`image` | `resume` | `og`) and return `allowedContentTypes`, `maximumSizeInBytes`, and `addRandomSuffix: true` for that kind;
   - force the pathname prefix: `images/`, `resume/`, `og/` (ignore any client-supplied folder).
4. The file goes straight from the browser to Blob; the returned public URL is put into the form.
5. The URL is persisted **only when the form is saved** via its Server Action, which re-validates that the URL host matches the project's Blob store hostname (`*.public.blob.vercel-storage.com`).

> Do **not** rely on `onUploadCompleted` to write to the DB — it does not fire on `localhost` and adds a race. The form save is the source of truth.

### 10.2 Limits

| Kind | Types | Max size | Notes |
|---|---|---|---|
| image (avatar, cover, gallery) | `image/jpeg`, `image/png`, `image/webp`, `image/avif` | 5 MB | Client warns if width < 1200 px for covers. SVG **not allowed** (XSS risk). |
| resume | `application/pdf` | 5 MB | Stored as `resume/{slugified-name}-{random}.pdf` |
| og | `image/png`, `image/jpeg` | 2 MB | Recommended 1200×630 |

### 10.3 Display
- All images rendered with `next/image`; `remotePatterns` allows only the Blob store host. Always pass `sizes`. Covers use 16:9 `object-cover`.
- Be mindful that Vercel Image Optimization on Hobby has its own monthly limits — keep `deviceSizes`/`imageSizes` to a short list and don't generate unnecessary variants.

### 10.4 Orphan cleanup
- When an image/resume is **replaced or removed and the DB save succeeds**, the old blob is deleted with `del()` in the same Server Action (failure to delete is logged, not shown as an error).
- Deleting a project deletes its cover and all gallery blobs.
- Uploaded-but-never-saved files (user abandoned the form) are acceptable waste in MVP; Phase 9 may add a "Clean unused files" button that lists blobs not referenced by any row.

## 11. Contact form

### 11.1 Fields
Name*, Email*, Company (optional), Subject (optional), Message* (10–5,000 chars). Plus a hidden **honeypot** field (`website`) and a hidden **render timestamp**.

### 11.2 Behaviour (Server Action `sendMessage`)
1. Reject silently (pretend success) if honeypot filled, or form submitted < 3 s after render.
2. Validate with Zod; return field errors otherwise.
3. Rate limit: max **3 messages per IP hash per hour** and **20 total per day**; beyond that → "Too many messages, please email me directly at …".
4. Insert into `messages`.
5. If `RESEND_API_KEY` and `CONTACT_FROM_EMAIL` are set: send a notification to `contact_email` with `reply_to` = visitor's email. Email failure must **not** fail the submission (message is already saved); log it.
6. Show success state: "Thanks — I'll reply within 2 working days." (text editable later; hard-coded is acceptable in MVP).

### 11.3 Notes
- No CAPTCHA in MVP (honeypot + timing + rate limit is enough for a personal site). If spam becomes a problem, add Cloudflare Turnstile in Phase 9 (Decision Log entry required).
- Never echo raw visitor input into HTML without React escaping; never put visitor input into email headers other than `reply_to` (validated email).

## 12. Security requirements

> Threat model: the only valuable asset is **write access to the site** (defacement, phishing links on Raghav's name) and Raghav's **message inbox**. Attackers: drive-by bots, credential-stuffers, curious visitors. Security must be strong but simple.

### 12.1 Authentication & sessions (SEC-01)
- Password is never stored in plain text anywhere (not in repo, not in DB, not in logs). Only a **bcrypt hash (cost 12)** is stored in env var `ADMIN_PASSWORD_HASH`, **base64-encoded** (bcrypt hashes contain `$`, which Next.js's env loader would otherwise expand and corrupt).
- Password policy: ≥ 8 characters (relaxed from 14 at Raghav's request, D23; a longer passphrase is still recommended). `pnpm hash-password` script prompts for the password (hidden input) and prints the base64 hash.
- On successful login, issue a JWT signed with HS256 using `SESSION_SECRET` (≥ 32 random bytes), payload `{ sub: "admin", ver: <site_settings.session_version>, iat, exp }`, expiry **7 days**.
- Cookie: name `admin_session`, `HttpOnly`, `Secure` (in production), `SameSite=Lax`, `Path=/`, no `Domain`.
- "Log out of all devices" increments `site_settings.session_version` (no redeploy needed). Tokens whose `ver` differs from the current value are rejected. To avoid a DB read on every request, `proxy.ts` checks only signature + expiry; `requireAdmin()` (the real boundary) also checks `ver`.
- Logout clears the cookie.

### 12.2 Brute-force protection (SEC-02)
- Per IP hash: after **5 failed attempts in 15 minutes**, reject further attempts for 15 minutes (same generic error + "Try again later").
- Global: after **30 failed attempts in 1 hour** from any IPs, lock login for 1 hour and (if Resend configured) email Raghav.
- Every attempt adds ~300–500 ms constant delay on failure.

### 12.3 Authorization (SEC-03) — **defense in depth, non-negotiable**
1. `proxy.ts` redirects unauthenticated requests for `/admin/**` (except `/admin/login`) to `/admin/login?next=…`. This is a **UX convenience, not the security boundary.**
2. **Every** admin Server Action and admin Route Handler calls `await requireAdmin()` as its **first statement**. `requireAdmin()` verifies the JWT (signature, expiry, version) and throws/returns 401 otherwise.
3. Every admin page (Server Component) calls `requireAdmin()` before reading data.
4. Public data functions only ever return `published`/`visible` rows. Admin data functions live in a separate module (`src/server/admin/**`) that imports `server-only` and is never imported from public pages.
- A test (§16) enumerates all exported Server Actions in `src/server/actions/admin/**` and asserts each rejects unauthenticated calls.

### 12.4 Input handling (SEC-04)
- All inputs validated server-side with Zod (client validation is UX only). Unknown fields are stripped.
- All SQL via Drizzle query builder / parameterized `sql` template. **No string-concatenated SQL.**
- Markdown rendered with `react-markdown` without raw HTML; links restricted to `https:`, `http:`, `mailto:`; `javascript:` and `data:` URLs dropped.
- `dangerouslySetInnerHTML` is forbidden except for (1) the theme no-flash inline script (static string, no user data) and (2) JSON-LD structured data (§13.3), which must go through `serializeJsonLd()` in `src/lib/json-ld.ts` (escapes `<` so `</script>` cannot break out). See D15.
- Redirect targets (`next=`) must start with `/admin` and not `//`.

### 12.5 Secrets (SEC-05)
- Secrets only in Vercel Environment Variables and local `.env.local` (git-ignored). `.env.example` lists names with empty values.
- Never log secrets, tokens, password attempts or full request bodies.
- Never expose secrets to the client: no `NEXT_PUBLIC_` prefix on any secret. Only `NEXT_PUBLIC_SITE_URL` is public.

### 12.6 HTTP security headers (SEC-06) — set in `next.config.ts` `headers()`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Content-Security-Policy: frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'` (a full script-src CSP with nonces is a Phase 9 hardening item).
- `/admin/**` additionally: `Cache-Control: no-store`, `X-Robots-Tag: noindex, nofollow`.

### 12.7 CSRF (SEC-07)
- Server Actions: rely on Next.js built-in Origin/Host check; do not disable it.
- `/api/upload` and any other admin route handler: require the session cookie **and** verify `Origin` matches the site origin.

### 12.8 Privacy (SEC-08)
- Store only an IP **hash** (salted with `IP_HASH_SALT`). No third-party trackers or cookies on the public site (Vercel Analytics is cookieless). No cookie banner needed under these conditions.
- Messages older than 24 months may be deleted by Raghav; no automatic deletion in MVP.

## 13. Non-functional requirements

### 13.1 Performance (NFR-PERF)
- Lighthouse targets in §2.3. Core Web Vitals (p75, mobile): LCP < 2.5 s, CLS < 0.1, INP < 200 ms.
- Public pages ship minimal client JS: Client Components only for theme toggle, contact form, mobile nav, gallery lightbox, project tag filter enhancement. Target ≤ 100 KB gzipped JS on `/`.
- Public pages must not query the DB on every request (cached; §5.3). Neon suspends after 5 min idle, so uncached DB hits would add cold-start latency.
- Admin bundles (dnd-kit, react-hook-form, markdown preview) must never be included in public routes (separate route group).
- Fonts via `next/font` with `display: swap`; at most 2 weights.

### 13.2 Accessibility (NFR-A11Y) — WCAG 2.2 AA
- Semantic landmarks (`header`, `nav`, `main`, `footer`), one `h1` per page, logical heading order.
- All interactive elements keyboard reachable with visible focus ring; skip-to-content link.
- Images have meaningful `alt` (enforced by admin forms) or `alt=""` if decorative.
- Color contrast ≥ 4.5:1 for text (accent presets pre-validated).
- Forms: labels tied to inputs, errors announced (`aria-live`), not color-only.
- Drag-and-drop always has a keyboard alternative (↑/↓ buttons).
- Respect `prefers-reduced-motion`.

### 13.3 SEO (NFR-SEO)
- Per-page `generateMetadata`: title, description, canonical, Open Graph, Twitter card.
- JSON-LD: `Person` schema on `/` (name, jobTitle, url, sameAs = social links, email), `CreativeWork` on project pages.
- `sitemap.ts` includes `/`, `/projects`, all published project URLs with `lastModified`.
- `NEXT_PUBLIC_SITE_URL` drives absolute URLs (update when custom domain is added).

### 13.4 Reliability & data safety (NFR-REL)
- Neon provides point-in-time restore within its free-tier history window; plus the manual JSON export (§9.11). Runbook recommends exporting a backup monthly and before any migration.
- All multi-row writes (e.g. reorder, delete project + images) run in a DB transaction where the driver supports it; otherwise ordered so partial failure leaves data valid.
- Server Actions return typed results `{ ok: true, data } | { ok: false, error, fieldErrors? }` — never throw raw errors to the client; never leak stack traces.

### 13.5 Compatibility
- Last 2 versions of Chrome, Edge, Firefox, Safari; iOS Safari 16+; Android Chrome. Responsive from 320 px to 1920 px.

### 13.6 Observability
- Use Vercel runtime logs. Log (structured, one line): action name, ok/fail, duration, error code. No PII beyond message id.

## 14. Project structure, conventions & coding rules

### 14.1 Folder structure

```
/
├─ SPEC.md                    ← this file (source of truth)
├─ AGENTS.md                  ← short pointer: "Read SPEC.md §19 before any change"
├─ README.md                  ← setup summary + link to SPEC §20
├─ .env.example
├─ content/seed.json          ← starter content (used once by db:seed)
├─ drizzle/                   ← generated SQL migrations (committed)
├─ scripts/
│  ├─ migrate.ts              ← runs migrations only in production / when forced
│  ├─ seed.ts
│  └─ hash-password.ts
├─ src/
│  ├─ app/
│  │  ├─ (public)/            ← layout + pages for /, /projects, /projects/[slug]
│  │  ├─ admin/
│  │  │  ├─ login/page.tsx
│  │  │  └─ (protected)/      ← layout calls requireAdmin(); dashboard, profile, projects, …
│  │  ├─ api/upload/route.ts
│  │  ├─ resume/route.ts
│  │  ├─ sitemap.ts  robots.ts  opengraph-image.tsx  not-found.tsx  error.tsx
│  │  └─ globals.css
│  ├─ components/
│  │  ├─ ui/                  ← shadcn primitives
│  │  ├─ public/              ← public-site components (server-first)
│  │  └─ admin/               ← admin-only components
│  ├─ lib/
│  │  ├─ validation/          ← zod schemas, one file per entity (shared client/server)
│  │  ├─ markdown.tsx         ← the ONE markdown renderer
│  │  ├─ format.ts            ← dates, durations
│  │  └─ slug.ts
│  ├─ server/                 ← everything here imports 'server-only'
│  │  ├─ db/ (client.ts, schema.ts)
│  │  ├─ auth/ (session.ts, require-admin.ts, rate-limit.ts)
│  │  ├─ queries/public.ts    ← published/visible-only reads, cached
│  │  ├─ admin/queries.ts     ← admin reads (all rows)
│  │  ├─ actions/admin/*.ts   ← 'use server' mutations, one file per entity
│  │  ├─ actions/contact.ts
│  │  ├─ blob.ts              ← upload rules, delete helpers
│  │  └─ cache.ts             ← invalidateContent() — the single invalidation helper
│  └─ proxy.ts
├─ tests/ (unit/, e2e/)
├─ next.config.ts  drizzle.config.ts  tsconfig.json  eslint.config.mjs
```

### 14.2 Coding rules
- Server Components by default; add `'use client'` only when interactivity is required.
- One Zod schema per entity in `src/lib/validation/`; the same schema validates the form and the action. DB types inferred from Drizzle; form types inferred from Zod; no duplicated hand-written types.
- All mutations go through `src/server/actions/**` with this skeleton:

```ts
'use server'
export async function updateProject(input: unknown): Promise<ActionResult<Project>> {
  await requireAdmin();                         // 1. auth — ALWAYS first
  const parsed = projectSchema.safeParse(input); // 2. validate
  if (!parsed.success) return fail(parsed.error);
  const row = await db.transaction(/* 3. write */);
  await invalidateContent();                    // 4. invalidate public cache
  return ok(row);                               // 5. typed result
}
```

- No personal content (name, bio, project text) hard-coded in components. Static UI copy (button labels, section headings like "Projects") may be hard-coded.
- No `console.log` left in committed code (use the logger helper).
- Dates: store UTC, display in `Asia/Kolkata` for admin timestamps; month-precision dates are timezone-free.
- Commits: Conventional Commits (`feat:`, `fix:`, `chore:` …), small and focused; reference requirement IDs (e.g. `feat(admin): project form (FR-ADM-04)`).
- Branches: `main` = production. Work on feature branches; Vercel preview deploys per branch.
## 15. Delivery plan — phases, tasks, acceptance criteria

Rules: complete phases **in order**. A phase is done only when all its acceptance criteria (AC) pass and the Definition of Done (§16.3) is met. Tick boxes in this file as tasks complete (that's how progress is tracked). Each phase should be one or a few small PRs.

### Phase 0 — Accounts & scaffolding *(Raghav + agent, ~1 h)*
- [x] Raghav: create GitHub account/repo `portfolio` (private is fine), Vercel account (sign in with GitHub). *(See §20.1)*
- [x] Scaffold: `pnpm create next-app` (TypeScript, ESLint, Tailwind, App Router, `src/`, Turbopack), commit lockfile.
- [x] Add Prettier, Vitest, Playwright, shadcn/ui init, `.env.example`, `AGENTS.md`, `README.md`.
- [x] Copy this `SPEC.md` into the repo root.
- [x] Import repo into Vercel; first deploy of the blank app succeeds.
- [x] Record the caching approach chosen (§6.3) in §18.

**AC:** `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` all pass locally and in Vercel; the `*.vercel.app` URL loads.

### Phase 1 — Database, schema, seed
- [x] Vercel → Storage → create **Neon** database, connect to project (Production + Preview + Development); `vercel env pull .env.local`.
- [x] Implement `schema.ts` exactly per §7 (incl. checks, enums, FKs, indexes, uniques); generate first migration.
- [x] `scripts/migrate.ts`, `scripts/seed.ts`, `content/seed.json` (filled from Raghav's resume — §17 Q3). *(seed.json holds `TODO:` placeholders until Raghav shares his resume; replace before the real launch content goes in.)*
- [x] Zod schemas for every entity in `src/lib/validation/` with unit tests for limits, URL rules, slug rules, section-array rules.

**AC:** fresh DB → `pnpm db:migrate && pnpm db:seed` produces exactly 1 `site_settings` row + seed content; running seed again changes nothing; Zod tests pass.

### Phase 2 — Public site (read-only, from DB)
- [x] `src/server/queries/public.ts` (published/visible only, cached + tagged).
- [x] Layout, theme tokens, light/dark + toggle, accent presets (§8.9).
- [x] Hero, About, Projects (home), Experience, Skills, Education, Certifications, Contact (static email + links for now), Footer — rendered in `sections` order.
- [x] `/projects` with tag filter, `/projects/[slug]`, `/resume`, 404/error pages.
- [x] Metadata, JSON-LD, sitemap, robots, OG image.

**AC:** All FR-PUB-01…08 satisfied with seed data; hiding a section or item directly in the DB (then invalidating) hides it on the site; draft project slug returns 404; Lighthouse mobile meets §2.3 on the preview URL; axe reports 0 serious/critical issues.

### Phase 3 — Auth
- [x] `hash-password` script; `session.ts` (sign/verify with `jose`), `require-admin.ts`, `rate-limit.ts`, `proxy.ts`.
- [x] `/admin/login`, logout, protected admin layout shell (sidebar, empty pages).
- [x] Security headers (§12.6).

**AC:** unauthenticated `/admin/*` → redirect to login; wrong password ×5 → locked 15 min; correct password → dashboard; cookie flags verified (HttpOnly, Secure in prod, SameSite=Lax); bumping session version logs out existing sessions; calling an admin Server Action without a cookie returns unauthorized (automated test).

### Phase 4 — Admin CRUD (no uploads yet)
- [x] Generic admin building blocks: `ListTable` with reorder + visibility toggle, `EntityForm`, `ConfirmDialog`, `MarkdownField`, `TagInput`, toasts, dirty-form guard.
- [x] Profile (text fields), Projects (all non-image fields, draft/publish/feature, duplicate, delete), Experience, Education, Skills, Certifications, Social links, Settings (sections, accent, SEO text, contact toggle, log out all devices).
- [x] `invalidateContent()` called in every mutation.

**AC:** For **each** entity: create → appears on public site ≤ 5 s; edit → updates; hide → disappears; reorder → order changes; delete (with confirm) → gone. Invalid input shows inline errors and nothing is saved. Playwright covers the full project lifecycle (create draft → preview → publish → feature → edit → unpublish → delete).

### Phase 5 — Uploads
- [x] `/api/upload` with `handleUpload` + rules (§10); `ImageField`, `GalleryField`, `ResumeField` components with drag-drop, progress, preview, alt text.
- [x] Avatar, project cover, gallery, resume, OG image wired in; old-blob deletion on replace/remove/delete.
- [x] `next.config.ts` `images.remotePatterns` for the Blob host only.

**AC:** uploading a 6 MB image or an SVG is rejected (client and server); unauthenticated token request → 401; replacing the resume deletes the old blob and `/resume` serves the new one; deleting a project removes its blobs (verify in Vercel Blob browser).

### Phase 6 — Contact form & inbox
- [ ] Public contact form (§11) + `sendMessage` action with honeypot, timing, rate limits.
- [ ] Optional Resend notification.
- [ ] `/admin/messages` inbox (§9.8) + unread badge.

**AC:** valid message lands in inbox (and email if configured); 4th message within an hour from same IP is refused; honeypot submissions are silently dropped; disabling the form in Settings hides it.

### Phase 7 — Dashboard, preview, backup
- [ ] Dashboard cards + profile completeness checklist (§9.3).
- [ ] Draft preview route (§9.10).
- [ ] Backup export (§9.11).

**AC:** checklist reflects reality; preview of a draft renders with banner and is 404 for logged-out users; exported JSON contains every content table.

### Phase 8 — Hardening, polish, launch
- [ ] Full a11y pass (keyboard-only walkthrough of public site and admin), Lighthouse pass, `pnpm audit --prod`.
- [ ] Vercel Analytics + Speed Insights (optional).
- [ ] Replace seed content with final content via the **admin panel** (proves G2/G7).
- [ ] Custom domain (optional), update `NEXT_PUBLIC_SITE_URL`, submit sitemap to Google Search Console.
- [ ] Runbook (§20) verified by Raghav performing: add project, replace resume, hide section, read message — without help.

**AC:** All success metrics in §2.3 met on production URL. 🚀

### Phase 9 — Backlog (post-MVP, not committed)
Blog/notes section · Blob "clean unused files" tool · full nonce-based CSP · Turnstile on contact form · JSON backup import · per-section custom headings · GitHub repo auto-import for projects · view counts per project · multiple resumes (e.g. SDE vs Data) · scheduled monthly backup email.

## 16. Testing strategy & Definition of Done

### 16.1 Unit (Vitest)
- Zod schemas: boundaries (max lengths, URL schemes, slug regex, reserved slugs, date ordering, tags de-dup, sections uniqueness).
- `slug.ts`, `format.ts` (duration "1 yr 3 mos", "Present"), markdown link sanitizer.
- `session.ts`: valid token, expired, wrong signature, stale version.
- `rate-limit.ts`: thresholds and window expiry.

### 16.2 E2E (Playwright, against `pnpm build && pnpm start` with a test DB)
1. Visitor smoke: home renders hero + sections; project page opens; resume link redirects.
2. Auth: redirect to login; wrong password; lockout; login; logout.
3. **Authorization sweep:** call each admin Server Action / `/api/upload` without session → unauthorized.
4. Project lifecycle (Phase 4 AC).
5. Upload: cover image upload + save → visible on public card.
6. Contact: submit → appears in admin inbox → mark read → archive.
7. Settings: hide "Education" section → gone from home; reorder sections → order changes.

Tests must not hit the production DB or Blob store. Use a separate Neon branch/database (`DATABASE_URL_TEST`) and a separate Blob store/token for tests, or mock Blob in E2E.

### 16.3 Definition of Done (every task/PR)
- [ ] Implements exactly the referenced requirement IDs; nothing extra.
- [ ] `pnpm lint && pnpm typecheck && pnpm test` pass; E2E for touched flows pass.
- [ ] No new dependency outside §6.1 (or Decision Log entry + approval).
- [ ] Every new admin mutation: `requireAdmin()` first, Zod-validated, `invalidateContent()` after write, typed result.
- [ ] Works at 375 px and 1440 px, light and dark, keyboard-only.
- [ ] No secrets, personal content, or `console.log` committed.
- [ ] Spec updated if behaviour changed (and Decision Log entry added).
- [ ] Vercel preview deploy is green and manually checked.

## 17. Open questions (Raghav to answer before / during Phase 1)

| # | Question | Default if unanswered |
|---|---|---|
| Q1 | Target role(s)? (e.g. SDE‑1, Frontend, Data Analyst, ML Engineer) — drives headline, section order, and which projects to feature. | "Software Engineer" generic; order: About → Projects → Experience → Skills → Education → Certifications → Contact |
| Q2 | Are you a student/fresher or experienced? | If student: show Education above Experience |
| Q3 | Please share your resume (PDF) and LinkedIn URL — used to write `content/seed.json`. | Placeholder content clearly marked `TODO` |
| Q4 | Which 3–6 projects should be featured? Do you have screenshots, live links, GitHub repos? | Use top projects from resume; covers added later via admin |
| Q5 | Visual vibe: minimal & clean / bold & colourful / terminal‑dev aesthetic? Favourite accent colour? | Minimal, `indigo` accent |
| Q6 | Custom domain now or later? (e.g. `raghavtibra.com` / `.dev` / `.in`) | Later; use `*.vercel.app` |
| Q7 | Want email notifications for contact messages (needs a free Resend account + verified domain for best deliverability)? | No email; inbox in admin only |
| Q8 | Who writes the code: you with an AI coding agent (Claude Code / Cursor), or Claude builds it in this workspace and hands you the repo? | Agent-driven, phase by phase |
| Q9 | GitHub username? | — |

## 18. Decision log

| # | Date | Decision | Why | Alternatives rejected |
|---|---|---|---|---|
| D1 | 2026‑10‑08 | Built-in DB-backed admin CMS | Instant edits, no rebuilds, no third-party CMS account, full control | Git-based CMS (Keystatic/Decap/Tina: rebuild per edit, Git concepts for a non-dev); hosted CMS (Sanity/Contentful: another account, learning curve, vendor limits) |
| D2 | 2026‑10‑08 | Next.js 16 App Router on Vercel | User chose Vercel; first-class support; one codebase for site + admin | Separate React SPA + Express API (two deploys, more surface) |
| D3 | 2026‑10‑08 | Neon Postgres + Drizzle | Free tier (1 GB/project), native Vercel Marketplace integration, typed SQL, real migrations | Supabase (extra platform), SQLite/Turso (fine, but less Vercel-native), MongoDB (schema-less invites drift) |
| D4 | 2026‑10‑08 | Vercel Blob, public store, client uploads | Same dashboard; bypasses 4.5 MB function body limit; uploads don't incur transfer when client-side | Cloudinary/S3 (extra accounts); server uploads (size limit) |
| D5 | 2026‑10‑08 | Single-password auth (bcrypt + jose JWT cookie) | One user; zero external deps/accounts; easy to reason about | Auth.js/Clerk/Supabase Auth (overkill; OAuth app setup; more moving parts) |
| D6 | 2026‑10‑08 | No skill-level bars | Recruiters find self-rated percentages meaningless; chips are cleaner | Progress bars / star ratings |
| D7 | 2026‑10‑08 | Fixed accent presets, no colour picker | Guarantees AA contrast in both themes | Free colour picker |
| D8 | 2026‑10‑08 | Admin edits content + section order/visibility, not layout | Keeps design coherent and code simple | Page builder |
| D9 | 2026‑10‑08 | Caching approach: **Cache Components**. `cacheComponents: true` in `next.config.ts`; public reads use `'use cache'` + `cacheTag('content')`; admin mutations call `invalidateContent()`, which wraps `updateTag('content')`. | Scaffolded with Next 16.4.0 (`--cache-components`). Tag-based invalidation is targeted and matches the "content" tag design in §5.3 | `revalidatePath('/', 'layout')` (coarser; re-renders everything) |
| D10 | 2026‑10‑08 | Agent tooling lives outside the §14.1 app structure: `CLAUDE.md` (root), `.claude/skills/` (spec-phase, admin-mutation, done-gate, push-progress) and `.claude/notes/` (progress log; `scratch/` git-ignored) | Raghav asked the agent to set up its own rules, skills and working folder; keeps the per-task process repeatable across sessions | Keeping rules only in chat (lost between sessions) |
| D11 | 2026‑10‑08 | *(assumed)* Tooling details: Node pinned to **24.x** (`engines` + `.nvmrc`, matches local install; satisfies "22 LTS or newer"); dev-only `eslint-config-prettier` added so ESLint and Prettier don't conflict; shadcn/ui init (Radix, Nova preset = Lucide + Geist) brings its own runtime deps `radix-ui`, `class-variance-authority`, `cn` (shadcn's clsx + tailwind-merge replacement), `shadcn` (for `shadcn/tailwind.css`) and `tw-animate-css`, all treated as part of the "shadcn/ui" allow-list entry. Vitest sets the `@` alias itself (no `vite-tsconfig-paths`). | Same Node major locally and on Vercel; smallest tooling footprint that works | `vite-tsconfig-paths`, `@vitejs/plugin-react` (not needed for logic-only unit tests) |
| D12 | 2026‑10‑09 | *(assumed)* `src/server/db/schema.ts` does **not** import `server-only` (the rest of `src/server` does; `client.ts` does). The schema file uses relative imports instead of the `@/` alias. | drizzle-kit and `scripts/seed.ts` load the schema outside Next, where `server-only` throws. The file holds table definitions only, with no secrets or queries | Putting `server-only` in the schema (breaks drizzle-kit); duplicating enums by hand (drift) |
| D13 | 2026‑10‑09 | *(assumed)* Scripts in `scripts/` run on Node 24's built-in TypeScript support plus a 20-line resolver hook (`scripts/resolve-ts.mjs`) for the `@/` alias and extensionless imports. No `tsx`/`dotenv` dependency; `.env.local` is loaded with `process.loadEnvFile`. `pnpm build` runs `scripts/migrate.ts` first, which only migrates when `VERCEL_ENV=production` (§7.4). `pnpm db:migrate` passes `--force`. | §6.2: no new dependency for something small; Node is pinned to 24.x (D11) | `tsx` (new dependency), compiling scripts to JS |
| D14 | 2026‑10‑09 | *(assumed)* The seed inserts everything with one `db.batch([...])` (a single transaction over neon-http, which has no interactive transactions). It runs only when `site_settings` is empty. Seed content is validated with the same Zod schemas as the admin forms. Also: `pnpm-workspace.yaml` sets `esbuild: false` under `allowBuilds` (drizzle-kit's esbuild works without its install script). Phase 1 ran `db:migrate` + `db:seed` against the single Neon DB that Development/Preview/Production share, which was empty at the time. | All-or-nothing seeding; invalid seed content fails before any write | Per-table inserts (partial seeds on failure) |
| D15 | 2026‑10‑09 | JSON-LD may use `dangerouslySetInnerHTML`, only via `serializeJsonLd()` (escapes `<`, U+2028/2029). Added as a second exception in §12.4. Approved by Raghav. | §13.3 requires JSON-LD, which can only be injected as raw script text; the escaping is unit-tested with a `</script>` payload | Skipping JSON-LD (§13.3 unmet) |
| D16 | 2026‑10‑09 | Add `@axe-core/playwright` as a **dev** dependency for the "0 serious/critical axe issues" AC. Approved by Raghav. | Automated, repeatable a11y check; never shipped to the browser | Manual axe DevTools run only |
| D17 | 2026‑10‑09 | *(assumed)* Theme tokens: the spec names (`--bg`, `--fg`, `--muted`, `--border`, `--card`, `--accent`, `--accent-fg`) are the source of truth and shadcn's Tailwind colours are mapped onto them in `@theme inline`: `muted`/`accent` utilities = neutral surface, `primary`/`brand` = accent colour. Only Geist Sans is loaded (§13.1: one font); Geist Mono dropped. Accent hex values are duplicated in `src/lib/accent-colors.ts` for the OG image; a test keeps both in sync, and another test checks AA contrast for every preset in light and dark. | shadcn's `accent` means a hover grey, which would clash with the spec's brand-colour `accent` | Renaming spec tokens; a runtime colour picker (D7) |
| D18 | 2026‑10‑09 | *(assumed)* Absolute site URL = `NEXT_PUBLIC_SITE_URL`, else `https://$VERCEL_PROJECT_PRODUCTION_URL`, else `http://localhost:3000` (`src/lib/site-url.ts`). Non-https values are ignored. | The permanent domain is not decided yet (§17 Q6); canonical, sitemap and OG URLs stay correct on `*.vercel.app` without extra setup | Requiring the env var before first deploy |
| D19 | 2026‑10‑09 | *(assumed)* Unknown or draft `/projects/[slug]`: Cache Components streams the static shell first, so the **first** request for a never-seen slug returns HTTP 200 with the not-found UI and an injected `noindex` meta; repeat requests return a cached real 404. Accepted rather than using `dynamicParams = false` (which would hide newly published projects until a redeploy, breaking G4). Drafts never leak content either way. | Next.js can't change the status after the shell is sent (streaming guide). `noindex` keeps search engines away | `dynamicParams = false`; DB lookup in `proxy.ts` (Phase 3 scope, security-sensitive) |
| D20 | 2026‑10‑09 | *(assumed)* Social links render as text-labelled pills with a generic Lucide icon, because lucide-react 1.x has no brand icons (GitHub/LinkedIn/X). Brand SVGs would need hand-drawn paths. | Labels are clearer for recruiters and fully accessible | Inline brand SVGs; a new icon package (needs approval) |
| D21 | 2026‑10‑09 | *(assumed)* Test database = a second database `portfolio_test` inside the same Neon project (`CREATE DATABASE`, then `db:migrate` + `db:seed` with `DATABASE_URL`/`DATABASE_URL_UNPOOLED` overridden). `.env.local` gets `DATABASE_URL_TEST` and `DATABASE_URL_TEST_UNPOOLED`. `playwright.config.ts` refuses to run without `DATABASE_URL_TEST` and starts `pnpm build && pnpm start -p 3100` with the test URLs. Shared project quotas apply (Neon Free: 1 GB per project). | §16.2: tests must not touch the production database; this needs no new Neon project or paid branching | Neon branch (manual console step); toggling rows in the shared DB |
| D22 | 2026‑10‑09 | *(assumed)* JS budget (§13.1, ≤ 100 KB gz on `/`) is **not met** at 152 KB transferred, measured by Lighthouse on production: the two largest chunks (72 + 46 KB, 118 KB) are the React DOM and Next client runtime; the other 7 scripts (34 KB) are the bundler runtime, route chunks and the theme toggle. Lighthouse mobile performance is still 94–96, so it is accepted as the framework floor. Revisit in Phase 8. | No public-page Client Component is heavy; the baseline cannot be reduced without leaving Next | Dropping `next/link`/`next/image` (worse UX, no real saving) |
| D23 | 2026‑10‑09 | Auth (Phase 3), mostly *(assumed)*: the admin password minimum is **8** characters instead of 14 (Raghav asked for a simple password; supersedes the §12.1 policy). Lockout is counted from `login_attempts` rows (failures only; locked attempts are not recorded, so a lock expires on its own); the global lock counts failures from any IP. The client IP is the first `x-forwarded-for` hop. `login`/`logout` live in `src/server/actions/auth.ts` (public by necessity), so `src/server/actions/admin/**` holds only actions that call `requireAdmin()`; a unit test sweeps that folder. Vitest aliases `server-only` to an empty stub. E2E uses a throwaway password and its own secrets, never the real ones. The lockout email waits for Resend (Phase 6). | Simplest approach that meets §12; keeps the authorization sweep meaningful | Counting successes too; a separate lock table; Auth.js |
| D24 | 2026‑10‑10 | *(assumed)* Multi-row admin writes (reorder, anything touching several rows) use `db.batch([...])`, one atomic round trip, not `db.transaction()`. §14.2 and the `admin-mutation` skill say "transaction", but the `neon-http` driver has no interactive transactions (same reason as D14). Reorder also rejects id lists that don't match the table's current ids exactly (missing, unknown or repeated ids). | Atomic reorder without changing the driver | Switching to the WebSocket pool driver for transactions (new connection model, more moving parts) |
| D25 | 2026‑10‑10 | *(assumed)* Shared admin write helpers live OUTSIDE `src/server/actions/admin/`: `src/server/admin/{run,crud,resource,projects,skills,settings}.ts` and `src/lib/action-result.ts`. Action files stay thin (`requireAdmin()` first, Zod parse, delegate). | The authorization sweep test calls every export of every file in `actions/admin/` with no cookie and expects `UnauthorizedError`, and a `"use server"` file may only export async functions, so helpers there would break both | Helpers inside the action files (duplicated 8 times); relaxing the sweep (weakens the test) |
| D26 | 2026‑10‑10 | Raghav approved: the draft preview route (§9.10) stays in Phase 7. The Phase 4 project lifecycle E2E checks that a draft is NOT public, then publish → feature → edit → unpublish → duplicate → reorder → delete; the preview step is added to it in Phase 7. | The §15 Phase 4 AC lists "preview" but §15 Phase 7 builds the route | Pulling the preview route into Phase 4 |
| D27 | 2026‑10‑10 | Raghav approved: until uploads exist (Phase 5), publishing a project needs a non-empty summary and at least one technology. The cover image + alt requirement of §9.5 sits behind the single constant `REQUIRE_COVER_ON_PUBLISH` in `src/lib/admin/project.ts` (currently `false`); Phase 5 flips it and a unit test pins both states. Deleting a project cascades its gallery rows in the DB; deleting their Blob files arrives with uploads (Phase 5). Only published projects can be featured; unpublishing clears `featured`. `published_at` is set once, the first time a project is published. | Nothing can have a cover before Phase 5 | Blocking all publishing until Phase 5 |
| D28 | 2026‑10‑10 | New runtime dependencies for the admin, all already in §6.1: `react-hook-form`, `@hookform/resolvers`, `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `sonner`. `pnpm dlx shadcn add` also pulled in `next-themes` (used by its sonner wrapper); it is NOT in §6.1 and the site has its own theme toggle (D17), so it was removed and the wrapper no longer calls `useTheme` (toast colours follow the site's CSS variables). | §6.1; stop-and-ask rule for unlisted packages | Keeping `next-themes` |
| D29 | 2026‑10‑10 | *(assumed)* E2E structure: admin specs (`tests/e2e/admin-*.spec.ts`) run in their own Playwright project AFTER the read-only visitor/auth specs, and `admin-settings.spec.ts` runs alone after the rest (it changes section order/visibility, accent and the contact form on the home page that the others assert on). `auth.spec.ts` uses its own client IP (`x-forwarded-for`, D23) so its lockout counters don't collide with admin logins. Rows created by tests are prefixed `E2E-` and removed afterwards. The long project lifecycle test has a 90 s timeout (many round trips to a remote DB). | Mutating specs raced the specs that assert on the seeded public content | `workers: 1` for the whole suite (slow) |
| D30 | 2026‑10‑10 | `/projects/[slug]` now awaits `params` inside `<Suspense>` (`ProjectContent`), as the Next 16 "ISR with Cache Components" guide requires with Partial Prefetching; `AdminNav` (uses `usePathname()`) is wrapped in `<Suspense>` in the protected admin layout. Before this, a slug not in `generateStaticParams` at build time (every project published later from the admin) returned HTTP 500, and the production build failed on `/admin/projects/[id]`. Amends D19: an unlisted slug now serves the App Shell first and then the real page. | Found by the Phase 4 E2E (publish → public page) and `next build` | Re-deploying after every publish (breaks G4) |
| D31 | 2026‑10‑10 | *(assumed)* Shared upload rules live in `src/lib/upload-rules.ts` (client-safe: kinds, MIME/size limits, `checkFile`, `uploadPathname`, `isBlobUrl`, `blobHostFromToken`, `unusedFiles`) plus `src/lib/same-origin.ts`; `src/server/blob.ts` (`tokenOptions`, `assertOwnBlobUrls`, `deleteBlobs`, `blobSize`) sits on top of them. §14.1 names only `server/blob.ts`. `@vercel/blob` added (already in §6.1). | The browser must run the same checks as the server for fast feedback, and a `server-only` module can't be imported by Client Components | Putting the rules only in `server/blob.ts` (duplicated in the browser) |
| D32 | 2026‑10‑10 | *(assumed)* "Force the pathname prefix" (§10.1 step 3) is implemented as **reject unless the pathname is `<kind folder>/<one slugified file name>`**, because the Blob client token is bound to the pathname the client asked for. The token's content types, size limit and `addRandomSuffix` always come from the server rules. The store host is derived from `BLOB_READ_WRITE_TOKEN` (`vercel_blob_rw_<storeId>_…` → lower-cased `<storeId>.public.blob.vercel-storage.com`) and is used for the exact-host re-check on every save and for `images.remotePatterns` (none are configured when no token exists at build time). `/api/upload` checks the session first (401), then that `Origin` equals `Host` (403, §12.7). | The SDK offers no way to rewrite the pathname in `onBeforeGenerateToken`; the host can't be guessed from the env otherwise | Wildcard `*.public.blob.vercel-storage.com` in `remotePatterns` (allows other people's stores); a `BLOB_STORE_HOST` env var (one more thing for Raghav to set) |
| D33 | 2026‑10‑10 | *(assumed)* Saves are the source of truth (§10.1): the **project form** saves cover + alt and the whole gallery (rows replaced in one `db.batch`; a new project's id is generated with `crypto.randomUUID()` so project + gallery go in one batch), the **Profile form** saves the avatar, the **SEO form** saves the share image. The **résumé** is the exception: it saves on its own the moment it is uploaded (`updateResume`), because it is a standalone file with no form. Files that were replaced, removed or belonged to a deleted project are deleted AFTER the DB write succeeded (best-effort, failures logged, `unusedFiles()` decides). `REQUIRE_COVER_ON_PUBLISH` is now `true` (supersedes the cover part of D27). Gallery reorder is ↑/↓ buttons only (a local list, like experience highlights); admin previews use `next/image` `unoptimized` so they spend no image-optimization quota. | Simplest flow that matches §9.4/§9.5/§10; avoids orphaned DB rows | Auto-saving each upload (pending uploads would land in the DB before the form is valid); drag-to-reorder for the gallery (the immediate-save `SortableList` doesn't fit a local list) |
| D34 | 2026‑10‑10 | Blob stores created from the Vercel CLI: `media` (public, connected to all environments of `portfolio`) and `media-test` (public, not connected). The E2E server never gets the real token: `playwright.config.ts` always sets its `BLOB_READ_WRITE_TOKEN` to `BLOB_READ_WRITE_TOKEN_TEST` or, without it, a well-formed fake one (enough for everything that doesn't upload; the store host is derived from the token). Specs that upload for real (`admin-uploads.spec.ts`) skip without `BLOB_READ_WRITE_TOKEN_TEST`. ESLint now ignores `.claude/**` (Prettier already did; agent worktree copies were being linted). | §16.2: tests must not touch the production Blob store | Mocking Blob in E2E (can't prove the file really is deleted); one shared store |

New decisions are appended; old ones are never edited — supersede them with a new row.

## 19. Guardrails for AI coding agents (must-read)

You are implementing this spec for a non-developer owner. He will judge the result by whether it works and whether he can operate it alone. Follow these rules exactly.

### 19.1 Process
1. **Read the whole SPEC before the first change**, then re-read the sections for the phase you're working on.
2. Work on **one phase at a time** (§15), in order. Don't start the next phase until the current one's AC pass.
3. Before coding a task, state in 3–6 bullets *what* you'll change and *which requirement IDs* it satisfies. After coding, show how each AC was verified (command output, test names, or screenshots).
4. Keep changes small; commit after each working increment with a Conventional Commit message referencing requirement IDs.
5. Tick completed checkboxes in §15. Add a Decision Log row for any non-trivial choice.
6. If the spec is ambiguous, **pick the simplest option that satisfies the stated AC**, write it down as a Decision Log row marked "assumed", and continue — unless it's on the stop-and-ask list below.

### 19.2 Stop and ask Raghav before you…
- add any dependency not listed in §6.1;
- run or write a **destructive migration** (drop/rename/type-change) or any `DELETE`/`TRUNCATE` without a `WHERE id = …`;
- touch production data directly (SQL console, scripts against prod `DATABASE_URL`) other than the documented `db:migrate`;
- change auth, session, rate-limit or security-header behaviour beyond what §12 says;
- change the visual design direction, fonts, or accent presets;
- add any third-party service, tracking script, cookie, or paid plan;
- remove or weaken a test to make it pass;
- deviate from the folder structure (§14.1) or tech stack (§6.1).

### 19.3 Never
- Never commit secrets, `.env*` files (except `.env.example`), passwords, or hashes.
- Never hard-code Raghav's personal content in components — it belongs in the DB (or `content/seed.json` for the one-time seed).
- Never write an admin Server Action/Route Handler without `await requireAdmin()` as the first statement.
- Never trust client-side validation alone; never skip the Zod parse on the server.
- Never render user-provided HTML; never add `rehype-raw`; never use `dangerouslySetInnerHTML` with data.
- Never query the database from a Client Component or expose DB/Blob tokens to the browser.
- Never return draft/hidden content from public queries.
- Never disable TypeScript strictness, ESLint rules, or Next.js Server Action origin checks to "get it working".
- Never use APIs from older Next.js versions (Pages Router, `getServerSideProps`, `middleware.ts` for new code, synchronous `cookies()`/`params`).
- Never add placeholder/"lorem ipsum" text to production; use clearly marked `TODO:` seed values that the dashboard checklist flags.
- Never claim something works without having run it.

### 19.4 Always
- Always run `pnpm lint && pnpm typecheck && pnpm test` before declaring a task done.
- Always design for the owner: clear labels, helper text, forgiving forms, confirmations before destructive actions, toasts after saves.
- Always keep the public site fast: server components, cached reads, minimal client JS, `next/image`.
- Always keep this spec and the code in sync.

## 20. Runbook

### 20.1 One-time setup (Raghav, ~20–30 min, with the agent's help)
1. **GitHub:** create an account → new repository `portfolio`.
2. **Vercel:** sign up with GitHub (Hobby plan) → *Add New Project* → import `portfolio`.
3. **Database:** Vercel project → *Storage* → *Create* → **Neon** (Postgres) → connect to the project for all environments.
4. **Blob:** Vercel project → *Storage* → *Create* → **Blob** → access **Public** → name `media` → connect to all environments.
5. **Secrets:** locally run `pnpm hash-password` → copy the output. In Vercel → *Settings → Environment Variables* add: `ADMIN_PASSWORD_HASH`, `SESSION_SECRET` (generate: `openssl rand -base64 48`, or the agent gives you one), `IP_HASH_SALT` (same way), `NEXT_PUBLIC_SITE_URL`.
6. *(Optional)* **Resend:** create account → API key → add `RESEND_API_KEY`, `CONTACT_FROM_EMAIL`.
7. **Deploy:** push to `main` (or click *Redeploy*). Visit `https://<project>.vercel.app/admin` → log in.
8. Store your admin password in a password manager. It cannot be recovered, only reset (§20.5).

### 20.2 Everyday use (no code)
| I want to… | Do this |
|---|---|
| Add a project | Admin → Projects → **+ New project** → fill form → **Publish** |
| Save a half-finished project | … → **Save draft** (not visible publicly) → **Preview** to check |
| Show a project on the home page | Projects → ☆ Featured toggle |
| Change project order | Projects → drag rows (or ↑/↓) |
| Update resume | Dashboard → **Replace resume** → pick PDF → Save |
| Hide a whole section | Settings → Sections → eye toggle |
| Change colour | Settings → Appearance |
| Read messages | Messages (badge shows unread) |
| Back up content | Settings → Backup → Download (do monthly) |

### 20.3 Deploying code changes (when an agent adds features)
Feature branch → push → Vercel builds a **Preview URL** → check it → merge to `main` → production deploys automatically. Migrations run automatically on production builds.
⚠ Preview deployments use the **same database** as production (unless Neon branching is configured). Content edits made on a preview admin **change the live site**. Treat preview admin as production.

### 20.4 If something breaks
- **Site down after a deploy:** Vercel → Deployments → previous good deployment → *Promote to Production* (instant rollback).
- **Content accidentally deleted:** Neon console → restore/branch from a point in time before the deletion (within the free plan's history window), or re-enter from the latest JSON backup.
- **Locked out (rate limit):** wait 15 min (or 1 h for global lock).

### 20.5 Forgot admin password
Run `pnpm hash-password` with a new password → replace `ADMIN_PASSWORD_HASH` in Vercel env vars → *Redeploy*. Then Settings → "Log out of all devices".

## 21. Appendix

### 21.1 Environment variables

| Name | Required | Public? | Set by | Purpose |
|---|---|---|---|---|
| `DATABASE_URL` | ✅ | No | Neon integration | Postgres connection (pooled) |
| `DATABASE_URL_UNPOOLED` | ✅ (migrations) | No | Neon integration | Direct connection for drizzle-kit |
| `BLOB_READ_WRITE_TOKEN` | ✅ | No | Blob integration | Client-upload token generation, `del()` |
| `ADMIN_PASSWORD_HASH` | ✅ | No | Raghav | base64(bcrypt hash, cost 12) |
| `SESSION_SECRET` | ✅ | No | Raghav | ≥ 32 random bytes, JWT signing |
| `IP_HASH_SALT` | ✅ | No | Raghav | Salt for IP hashing |
| `NEXT_PUBLIC_SITE_URL` | ✅ | Yes | Raghav | Canonical absolute URL |
| `RESEND_API_KEY` | ⬜ | No | Raghav | Contact email notifications |
| `CONTACT_FROM_EMAIL` | ⬜ | No | Raghav | Verified sender, e.g. `portfolio@yourdomain.com` |
| `DATABASE_URL_TEST` | ⬜ (CI) | No | Agent | Test database for E2E |
| `BLOB_READ_WRITE_TOKEN_TEST` | ⬜ (E2E uploads) | No | Agent | Read-write token of a separate Blob store for the upload E2E specs; they skip without it (D34) |

(Exact variable names created by the Neon/Blob integrations may differ slightly; use what the integration creates and update this table.)

### 21.2 Free-tier limits relevant to this project (checked 2026‑10‑08 — re-check periodically)

| Service | Free allowance | Our expected usage |
|---|---|---|
| Vercel Hobby | Free; personal, non-commercial use | Portfolio = fits |
| Vercel Blob (Hobby) | 1 GB storage, 10 GB data transfer, 10k simple / 2k advanced ops per month. **If exceeded, Blob is blocked until the 30-day window resets (no surprise bill).** | ~20–100 MB of images + 1 PDF. Note: browsing the Blob store in the Vercel dashboard also counts as operations. |
| Vercel Functions | 4.5 MB request body limit | Why uploads are client-side |
| Neon Free | 1 GB storage/project, 100 CU‑hours/project, scales to zero after 5 min idle | < 10 MB of data; cached pages keep compute usage tiny |
| Resend Free | 100 emails/day, 3,000/month | A handful per week |

### 21.3 References
- Next.js blog & release notes — https://nextjs.org/blog
- Next.js 16 `proxy.ts` — https://vercel.com/academy/nextjs-foundations/proxy-basics
- Vercel Blob pricing & limits — https://vercel.com/docs/vercel-blob/usage-and-pricing
- Vercel Blob server vs client uploads — https://vercel.com/docs/vercel-blob/server-upload , https://vercel.com/docs/vercel-blob/client-upload
- Neon pricing — https://neon.com/pricing
- Resend quotas — https://resend.com/docs/knowledge-base/account-quotas-and-limits
- WCAG 2.2 — https://www.w3.org/TR/WCAG22/

---
*End of SPEC v1.0. Changes to this document are made via PR and recorded in §18.*
