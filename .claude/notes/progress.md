# Progress

_Updated at the end of every task. Newest phase on top._

## Phase 7 — Dashboard, preview, backup · built and verified locally (2026-10-10)

### Open
- **Not looked at by hand.** Only automated checks ran: the dashboard has axe (0 serious/critical) and a 375 px overflow check; the preview page and the Settings Backup block have neither a manual look nor an axe pass of their own (Settings is axe-checked as a whole in `admin-settings.spec.ts`, which passed). A visual pass of dashboard, preview (draft and published, light/dark, 375 / 1440 px) and a downloaded backup file belongs in Phase 8.
- **Unit test flaked once.** One `pnpm test` run (while the E2E server was shutting down) showed 1 failed of 418; the output was cut to the summary line, so the test is unknown. The next 5 runs and the final run passed (430/430). If it recurs, capture the full output.
- The earlier flaky "visible on the public site <= 5 s" E2E check did not appear in the final full run; still not root-caused (Phase 8).
- Live production dashboard shows the seed `TODO:` text as unfinished checklist items (about, SEO description) until real content is entered via the admin.

### Built
- Dashboard (FR-ADM-02): `src/lib/admin/dashboard.ts` (checklist + résumé age rules), `getDashboardData()`, cards (published, drafts, unread, résumé last updated + 90-day warning), six-item "Profile completeness" list that links to the fixing form, quick actions. `#resume` and `#seo` anchors added so the links land on the right block.
- Draft preview (FR-ADM-09): `/admin/preview/projects/[id]` in the new `(preview)` route group; `site-shell.tsx` and `project-article.tsx` extracted from the public layout/page so the preview cannot drift; sticky "Preview — not public" banner; Preview button on the saved project form. Logged-out visitors are redirected to login (D41).
- Backup (FR-ADM-10): `exportBackup()` Server Action → JSON text → file download from Settings → Backup. `src/lib/admin/backup.ts` (`BACKUP_TABLES`, filename, blob URL list), `src/server/admin/backup.ts` (reads), `BackupButton`.
- Decision Log D41-D44. No new dependency, no migration, `proxy.ts` untouched.

### AC evidence
- `pnpm lint`, `typecheck`, `format:check`, `build` exit 0. `pnpm test` -> 31 files, 430 tests passed. Written first and seen failing: `dashboard.test.ts` (14), `backup.test.ts` (11, includes "BACKUP_TABLES equals every table in schema.ts except login_attempts"). The authorization sweep picked up `actions/admin/backup.ts` automatically.
- `pnpm test:e2e` (test DB + test Blob store, final tree): **89 passed, 10 skipped** (desktop-only specs on mobile), exit 0.
  - Checklist reflects reality: `admin-dashboard.spec.ts` polls until each card number (published, drafts, unread) and each of the six checklist ticks equals a fresh SQL read of the test DB; inserting a draft by SQL raises the Drafts card; quick-action and checklist links land on `/admin/projects/new`, `/admin/profile#resume`, `/admin/settings#seo`; axe 0 serious/critical and no overflow at 375 px.
  - Preview: in the project lifecycle spec, the saved draft's Preview button opens a new tab with the banner, the title as the only `h1`, the summary and the public site header; a logged-out context on the same URL ends on `/admin/login` and never shows the summary; an unknown id and `not-a-uuid` show "Page not found".
  - Backup: `admin-backup.spec.ts` clicks Download backup; file name matches `portfolio-backup-YYYY-MM-DD.json`; keys are exactly `blobUrls`, `exportedAt`, `tables`; the 10 content tables are present as arrays, `login_attempts` is absent; one `site_settings` row without `sessionVersion`; a seeded project's id is in the file.

### Notes
- The E2E server build hit the known Neon `fetch failed` once (first dashboard run, and once more in a later partial run that still passed); the immediate rerun was clean. `upstream image ... 404` lines in the E2E log come from the lifecycle spec's synthetic cover URL and are not new.
- The `admin` Playwright project runs spec files in parallel, so specs that compare against the DB poll until page and SQL agree instead of comparing once.
- `pnpm test:e2e <file> --project=admin` still runs every admin spec because of the project's `testMatch`; pass a `--grep` to narrow it.

## Phase 6 — Contact form & inbox · built and verified locally (2026-10-10)

### Open
- **Real email is not verified.** No Resend account exists (§17 Q7 default: inbox only), so `RESEND_API_KEY` / `CONTACT_FROM_EMAIL` are unset everywhere. The send code and the lockout alert are unit-tested against a mock only (D40). To turn on: create a Resend account, verify a sender, add both variables on Vercel, redeploy, send yourself a test message.
- Unread badge and inbox on the live admin, and the live form, have not been looked at by hand (axe + 375 px overflow pass in E2E).
- **Flaky check seen again:** the first full E2E run failed once in `admin-projects.spec.ts` ("published project visible on the public site <= 5 s", line 177); that failure also stopped 18 dependent tests. The immediate rerun passed fully. Same family as the Phase 5 note below; still not root-caused. Investigate before launch (Phase 8).

### Built
- `src/lib/contact-rules.ts` (honeypot / 3 s / stamp rules, 3-per-hour and 20-per-day limits, `replyMailto`, success text), `formatRelativeTime` + `formatAdminTimestamp` (Asia/Kolkata) in `src/lib/format.ts`.
- `src/server/actions/contact.ts` (`sendMessage`, public), `src/server/contact.ts` (rate counts + insert), `src/server/email.ts` (optional Resend: contact notification + the §12.2 lockout alert, wired into `login` via `justEngagedGlobalLock`).
- `ContactForm` (plain `useActionState`, no form library) in the Contact section when `contact_form_enabled`; the email link and socials stay either way.
- Admin: `/admin/messages` inbox (Inbox / Archived tabs, side sheet, Reply `mailto:`, Mark unread, Archive, Delete with confirm), `src/server/actions/admin/messages.ts`, unread badge in the nav (server component streamed into a nav slot).
- Decision Log D36-D40. New dep: `resend` (already §6.1). No migration.

### AC evidence
- `pnpm lint`, `typecheck`, `format:check`, `build` exit 0. `pnpm test` -> 29 files, 404 tests passed (rules, format, email, `sendMessage` and the lockout decision were written first and seen failing; the authorization sweep now includes `messages.ts`).
- `pnpm test:e2e` (test DB, final tree, second run): **82 passed, 10 skipped** (desktop-only specs on mobile), exit 0. New `admin-messages.spec.ts`: visitor message -> row (IP stored only as a 64-char hash) -> badge -> open marks read -> mark unread -> archive -> Archived tab -> delete (cancel keeps it); a message after a real 3 s wait is stored; **4th message from one IP in an hour is refused with the "email me directly at ..." text and no row (3 rows)**; honeypot and under-3 s submissions show success but store nothing; invalid input shows inline errors, keeps the text, stores nothing; axe 0 serious/critical and no overflow at 375 px on `/` and `/admin/messages`. `admin-settings.spec.ts`: turning the contact form off removes it from `/` within 5 s, turning it on brings it back.

### Notes
- A `"use server"` file may only export async functions: exporting the success-text constant broke `next build` while all unit tests passed. The constant now lives in `contact-rules.ts`.
- The tab list needs a `TabsContent` panel or axe flags `aria-controls` as critical.

## Phase 5 — Uploads · built and verified locally (2026-10-10)

### Open
- Raghav tried a real upload on the live admin and said it works; a systematic look at 375 / 1440 px, light/dark and keyboard-only is still for Phase 8 (axe + 375 px overflow checks pass on the new fields).
- RESOLVED 2026-10-10: `SESSION_SECRET`, `IP_HASH_SALT`, `ADMIN_PASSWORD_HASH` are now set on Vercel (Production + Preview, sensitive) and production was redeployed. Raghav logged in on the live admin and confirmed uploads work. The Blob token is set (store `media`, all environments).
- Leftovers on Raghav's Vercel account (all free, empty): store `media-test` (unused, can be deleted in the dashboard) and project `portfolio-e2e` + store `media-e2e` (hold the E2E token; keep while you run E2E).

### Built
- `src/lib/upload-rules.ts` (limits, `checkFile`, `uploadPathname`, `isBlobUrl`, `blobHostFromToken`, `unusedFiles`), `src/lib/same-origin.ts`, `src/server/blob.ts`, `src/app/api/upload/route.ts` (session -> 401, Origin -> 403, token rules from the server).
- `ImageField`, `GalleryField`, `ResumeField`, `FileDrop`, `use-upload`; wired into the project form (cover + gallery; publishing now needs a cover), Profile (avatar; résumé saves on its own), Settings -> SEO (share image + link preview), project list thumbnails.
- `images.remotePatterns` = this store's host only (derived from the token). Decision Log D31-D35. New dep: `@vercel/blob` (§6.1).
- ESLint now ignores `.claude/**` (it was linting the untracked agent worktree: 15k errors).

### AC evidence
- `pnpm lint`, `typecheck`, `format:check`, `build` exit 0. `pnpm test` -> 26 files, 366 tests passed (schemas, blob helpers and the route were written first and seen failing; the `upload-rules` tests were not seen failing before the implementation).
- `pnpm test:e2e` (test DB + separate test Blob store, final tree): **76 passed, 10 skipped** (the desktop-only auth specs on mobile), exit 0. Against the real test store: Blob itself refuses an SVG and a 6 MB file even with a valid token; cover + 2 gallery images -> on the public card within 5 s; dropping a gallery image deletes its file; **deleting the project deletes its cover and gallery files** (`head()` -> not found); **replacing the résumé deletes the old file and `/resume` redirects to the new one**; removing it deletes the file; avatar and share image upload/remove delete their files. Offline: unauthenticated `/api/upload` -> 401, foreign/missing Origin -> 403, token types/size/random suffix per kind, bad kind/folder -> 400, 6 MB image / SVG / PNG-as-résumé rejected in the browser with no request sent. Production store `media` held 0 files after all runs.

### Notes
- E2E: a full run takes ~5 min. Before the last change, several full runs each failed one "visible on the public site <= 5 s" check in a different spec (and once a transient Neon `fetch failed`); each passed alone. Fixes: the uploads spec runs in its own project after `admin` (D35), lifecycle tests have a 90 s timeout, and the skills hide/show/remove steps wait for the saved row before timing the 5 s window. Possible product-side cause not proven: a public page regenerating while a write + invalidation lands could keep stale content until the next edit. One clean full run after the change; if it recurs, investigate before launch.
- Mistake worth knowing: running `pnpm` in a scratch git worktree whose `node_modules` was a junction to this repo re-pointed this repo's package links at the scratch path and broke the build (fixed with `pnpm install --frozen-lockfile`). Never share `node_modules` between worktrees.

## Phase 4 — Admin CRUD (no uploads) · built and verified locally (2026-10-10)

### Built
- Entities, all with list/form, reorder, show/hide, delete-with-confirm, inline errors, toasts, unsaved-changes guard: social links, certifications, education, experience, skills (group cards + chips), profile (text fields), settings (section order/visibility, accent, SEO, contact toggle, log out of all devices), projects (filters, search, publish/feature, duplicate, delete by typing the title).
- Shared pieces: `ResourceManager`, `SortableList` (drag + up/down, 500 ms debounced save), `VisibilityToggle`, `ConfirmDialog`, `useEntityForm`/`Field`, `MarkdownField`, `TagInput`, `ListEditor`; server `runMutation` (write -> `invalidateContent()` -> log), `listResource`, `applyOrder` (atomic `db.batch`).
- Decision Log D24-D30. New deps (all SPEC 6.1): react-hook-form, @hookform/resolvers, @dnd-kit/*, sonner. shadcn's `next-themes` was removed (not in 6.1).

### Two real bugs found by the E2E and fixed (D30)
- `/projects/[slug]` returned **HTTP 500** for any slug not known at build time, i.e. every project published later from the admin. `params` is now awaited inside `<Suspense>`.
- `next build` failed on `/admin/projects/[id]` (`usePathname()` in `AdminNav` outside Suspense). Wrapped in Suspense.

### AC evidence
- `pnpm format:check`, `typecheck`, `lint` exit 0. `pnpm test` -> 23 files, 273 tests passed (includes the unauthenticated-call sweep over every admin action file).
- `pnpm test:e2e` (test DB, production build, run on the final tree): **65 passed, 10 skipped** (the auth specs are desktop-only), exit 0. Per entity: invalid input saves nothing; create/edit/hide/reorder/delete each reflected on the public site within 5 s; axe 0 serious/critical; no horizontal scroll at 375 px. Projects lifecycle: draft is not public -> publish -> feature -> edit (`published_at` unchanged) -> unpublish -> duplicate -> reorder -> delete.

### Not verified / open
- Preview is **not** in this phase (D26, approved): the lifecycle checks "draft is not public" instead; Phase 7 adds the preview step.
- Publish does not require a cover image yet (D27); flip `REQUIRE_COVER_ON_PUBLISH` in Phase 5.
- Deleting a project removes its gallery rows only; Blob files are deleted in Phase 5.
- E2E needs Neon from this machine; builds/tests intermittently fail with `fetch failed` or slow logins. The suite uses generous waits for the save before timing the 5 s public window. If a run fails with a Neon error, rerun before debugging.
- Manual look at the admin at 375 / 1440 px was **not** done beyond the automated axe + overflow checks.
- Vercel env vars (`SESSION_SECRET`, `IP_HASH_SALT`, `ADMIN_PASSWORD_HASH`) are still not set, so the admin is unusable on the deployed site (Phase 3 item, unchanged).

## Phase 3 — Auth · built and verified locally (2026-10-09); NOT live until Vercel env vars are set

### Blocked on Raghav
- **Vercel env vars.** The auto-mode classifier refused the agent's write to Vercel's secret store, so production/preview have no `SESSION_SECRET`, `IP_HASH_SALT` or `ADMIN_PASSWORD_HASH`. Until they're added, `/admin/login` on Vercel shows "Login is unavailable". Locally they're in `.env.local` (hash of the password Raghav chose). Add them yourself with `pnpm.cmd dlx vercel@latest env add <NAME> production` (and `preview`, `development`), or ask the agent to retry once permitted. To make a fresh hash: `pnpm hash-password`.
- Do not paste the real password into tests or docs (it is not in the repo; checked by grep).

### Built
- `src/server/auth/` (`session.ts`, `rate-limit.ts`, `login-attempts.ts`, `password.ts`, `require-admin.ts`), `src/proxy.ts`, `src/lib/{safe-next,ip-hash,logger}.ts`, `src/server/actions/auth.ts` (login/logout), `src/server/actions/admin/settings.ts` (`logoutAllDevices`), `/admin/login`, protected layout + sidebar + empty pages, §12.6 headers in `next.config.ts`, `scripts/hash-password.ts`.
- New deps `jose`, `bcryptjs` (§6.1). Decision Log D23.

### AC evidence
- `pnpm lint`, `typecheck`, `format:check` exit 0. `pnpm test` → 17 files, 216 tests passed (session, rate-limit, safe-next, password, ip-hash, authorization sweep: every export in `src/server/actions/admin/**` rejects with no cookie). `pnpm build` passes (`ƒ Proxy` registered, `/admin/*` partially prerendered).
- `pnpm test:e2e` (test DB) → 36 passed, 10 skipped (auth specs run on desktop only): logged-out `/admin/projects` → login with `next=`; wrong password → generic error; 5 wrong → locked even for the right password; login → requested page; cookie `HttpOnly`, `Secure`, `SameSite=Lax`, path `/`; off-site `next=` ignored; already-logged-in `/admin/login` → dashboard; bumping `session_version` logs out; logout; §12.6 headers + `no-store`/`noindex` on `/admin`; axe 0 serious/critical on the login page.

### Not verified
- `pnpm hash-password` needs an interactive terminal; it was not run by the agent.
- The 15-minute lock expiry and the 30/hour global lock are covered by unit thresholds only, not waited out in E2E.
- No manual look at the admin shell at 375/1440 px yet; Vercel deploy not checked.

## Phase 2 — Public site · built and verified (2026-10-09); waiting on Raghav's content

All §15 Phase 2 tasks ticked. Production deploy of `94a64a7` is green (GitHub deployment status `success`, seen by the agent). Production domain: `https://portfolio-pi-six-sk3rfqi4dy.vercel.app` (the sitemap there uses it via `VERCEL_PROJECT_PRODUCTION_URL`; `NEXT_PUBLIC_SITE_URL` is still unset).

### Built
- `src/server/queries/public.ts` (all reads `'use cache'` + `cacheTag('content')` + `cacheLife('max')`), `src/server/cache.ts` (`invalidateContent()`, unused until Phase 4).
- Theme tokens, 8 accents, no-flash dark mode, toggle; public layout; hero + 7 sections rendered in `sections` order; `/projects` (tag filter), `/projects/[slug]`, `/resume`, 404/error; metadata, JSON-LD, sitemap, robots, OG image.
- Decision Log D15–D22. New deps: `react-markdown`, `remark-gfm` (§6.1), `@axe-core/playwright` (dev, D16).

### AC evidence
- `pnpm lint`, `typecheck`, `format:check` exit 0. `pnpm test` → 11 files, 180 tests passed. `pnpm build` passes (one earlier run failed with `fetch failed` to Neon; DB was reachable on rerun and the build passed — builds depend on Neon being up).
- `pnpm test:e2e` (test DB, chromium + Pixel 7) → 26 passed: visitor smoke, tag filter, theme toggle, 375 px above-the-fold and no horizontal scroll, axe on `/`, `/projects`, a project page in light and dark → 0 serious/critical.
- Hide in DB → gone (test DB, temporary invalidation route, deleted and never committed): Education section hidden, only Experience item hidden (section disappears), project set to draft (gone from `/projects`), resume set (CTA + `/resume` 302), all restored. Invalidate round trip 81 ms (target ≤ 5 s). 11/11 checks passed.
- Draft slug: not-found page + `noindex`, real 404 on repeat requests; the very first request is 200 (D19).
- Lighthouse mobile on production: `/` perf 94, a11y 100, BP 100, SEO 100 (LCP 1.5 s, CLS 0). Project page: 96/100/100/100.
- Screenshots reviewed at 375 px (light) and 1440 px (dark).

### Not met / open
- JS on `/` is 152 KB transferred vs the ≤ 100 KB target (D22, framework baseline). Revisit in Phase 8.
- Keyboard-only walkthrough is covered only by axe + the skip link/focus ring; the full manual pass is Phase 8.
- Placeholder content is still `TODO:` (§17 Q3). No images exist, so `next/image` `remotePatterns` for Blob is Phase 5.
- First-request 200 for unknown slugs (D19) deviates from "returns 404"; say if you want a different trade-off.

### Environment
- Test database: `portfolio_test` inside the same Neon project; `DATABASE_URL_TEST` and `DATABASE_URL_TEST_UNPOOLED` are in `.env.local`. Re-seed with the override recipe in D21.

## Phase 1 — Database, schema, seed · done (2026-10-09)

Vercel production deploy of `da9b922` confirmed green by Raghav (reported, not seen by the agent). Phase 2 is next.

### Done (2026-10-09)
- Neon (Free) created via Vercel → Storage, connected to Development + Preview + Production (confirmed by Raghav).
- Repo linked with `vercel link` (newer CLI writes `.vercel/repo.json` → project `portfolio`), `vercel env pull .env.local` done. Run it as `pnpm.cmd dlx vercel@latest …`; PowerShell blocks `pnpm.ps1` on this machine.
- `.env.local` has `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED`, plus the integration's extras (`PG*`, `POSTGRES_*`, `NEON_*`, `NEON_AUTH_BASE_URL`/`VITE_NEON_AUTH_URL`; Neon Auth is unused).
- Read-only check over Neon's HTTP SQL endpoint: both URLs → `select 1` ok, db `neondb`, Postgres 18.6, 0 public tables (fresh).
- The CLI appended `.vercel` and `.env*` to `.gitignore`. That re-ignored `.env.example`, so the edit was reverted; the existing rules already cover both.

### Built (2026-10-09)
- `src/server/db/schema.ts` (11 tables, 4 enums, checks, FKs, indexes), `client.ts` (neon-http), `drizzle.config.ts`, migration `drizzle/0000_init.sql`.
- `scripts/migrate.ts`, `scripts/seed.ts`, `scripts/resolve-ts.mjs`; `content/seed.json` is all `TODO:` placeholders (resume pending, SPEC §17 Q3).
- Zod schemas for every entity in `src/lib/validation/` + `src/lib/slug.ts`. Tests written first and watched failing, then green.
- New deps (all §6.1): drizzle-orm, @neondatabase/serverless, zod, drizzle-kit (dev). Decision Log D12–D14.

### AC evidence
- `pnpm test` → 6 files, 122 tests passed. `pnpm lint`, `pnpm typecheck`, `pnpm format:check` exit 0.
- `pnpm build` → compiled; migrate step prints `skipped (VERCEL_ENV=unset)` locally, as designed.
- Fresh Neon DB: `pnpm db:migrate` → `ok` (1 migration recorded). `pnpm db:seed` → 1 site_settings, 2 social links, 3 projects, 1 experience, 1 education, 3 skill groups, 3 skills, 1 certification.
- Second `pnpm db:seed` → "already seeded … nothing changed"; counts identical.
- DB constraints verified by 9 deliberately bad inserts, all rejected by the expected constraint (singleton id, reserved/bad/duplicate slug, cover without alt, end before start, duplicate skill case-insensitive, short message body, unknown accent).

### Notes
- Heads-up for Raghav: Neon is shared by dev/preview/prod (SPEC §20.3), and it now holds the TODO seed. Real content goes in via seed.json before first launch seed, or via the admin panel (Phase 8).

## Phase 0 — Accounts & scaffolding · done (2026-10-09)

- Vercel import deployed; deployment URL `https://portfolio-pi-six-sk3rfqi4dy.vercel.app/` returns 200 with the scaffold page. The permanent production domain is still to be confirmed by Raghav (needed for `NEXT_PUBLIC_SITE_URL`).

### Done (2026-10-08)
- pnpm 12.10.1 via corepack (shims in `%APPDATA%\npm`; the default install dir needs admin).
- Next.js 16.4.0 (`latest` on npm at the time), React 19.3, TS strict, Tailwind 4.3, Cache Components on → D9.
- Prettier, ESLint + eslint-config-prettier, Vitest 5, Playwright 1.63 (config only), shadcn/ui (Radix, Nova).
- `.env.example`, README, AGENTS.md rules, CLAUDE.md, skills: spec-phase, admin-mutation, done-gate (+ push-progress from session portfolio-1a).
- Git: `main` → https://github.com/RaghavMT/Portfolio.git

### AC evidence (local)
- `pnpm lint` → exit 0
- `pnpm typecheck` → route types generated, `tsc --noEmit` exit 0
- `pnpm test` → 1 file, 2 tests passed
- `pnpm build` → compiled; `/` and `/_not-found` static; exit 0

## Open with Raghav
- Permanent production domain (Vercel → project → Overview → Domains).
- SPEC §17: Q1 target roles, Q3 resume + LinkedIn (seed uses `TODO:` placeholders until then), Q4 projects to feature, Q5 vibe/accent. Q2 answered: ~5 months' experience → default order. Q9: GitHub `RaghavMT`.
