# Progress

_Updated at the end of every task. Newest phase on top._

## Phase 1 — Database, schema, seed · in progress

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

### Remaining for Phase 1
- Vercel production build runs the migrate step: confirm on the next push to `main` that the deployment is green and its log shows `[migrate] ok`.
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
