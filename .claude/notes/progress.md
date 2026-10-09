# Progress

_Updated at the end of every task. Newest phase on top._

## Phase 1 — Database, schema, seed · in progress

### Done (2026-10-09)
- Neon (Free) created via Vercel → Storage, connected to Development + Preview + Production (confirmed by Raghav).
- Repo linked with `vercel link` (newer CLI writes `.vercel/repo.json` → project `portfolio`), `vercel env pull .env.local` done. Run it as `pnpm.cmd dlx vercel@latest …`; PowerShell blocks `pnpm.ps1` on this machine.
- `.env.local` has `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED`, plus the integration's extras (`PG*`, `POSTGRES_*`, `NEON_*`, `NEON_AUTH_BASE_URL`/`VITE_NEON_AUTH_URL`; Neon Auth is unused).
- Read-only check over Neon's HTTP SQL endpoint: both URLs → `select 1` ok, db `neondb`, Postgres 18.6, 0 public tables (fresh).
- The CLI appended `.vercel` and `.env*` to `.gitignore`. That re-ignored `.env.example`, so the edit was reverted; the existing rules already cover both.

### Next
- Part B of the plan: schema.ts, first migration, migrate/seed scripts, `content/seed.json` (TODO placeholders), Zod schemas + tests. Seed section order: default (Raghav has ~5 months' experience).

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
