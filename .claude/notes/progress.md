# Progress

_Updated at the end of every task. Newest phase on top._

## Phase 0 — Accounts & scaffolding · in progress (waiting on Vercel import)

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

### Remaining for Phase 0
- [ ] Raghav: Vercel → sign in with GitHub → Add New Project → import `RaghavMT/Portfolio` → Deploy. Then confirm the `*.vercel.app` URL loads and the Vercel build is green.

## Blocked on Raghav before Phase 1
- Vercel → Storage → create Neon DB, connect to all environments.
- SPEC §17 answers: Q1 target roles, Q2 student/experienced, Q3 resume PDF + LinkedIn, Q4 projects to feature (+ screenshots/links), Q5 vibe/accent, Q9 GitHub username (likely `RaghavMT`?).
