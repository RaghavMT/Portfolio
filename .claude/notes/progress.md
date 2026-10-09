# Progress

_Updated at the end of every task. Newest phase on top._

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
