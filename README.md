# Portfolio

Raghav Tibra's portfolio site with a built-in admin panel (`/admin`) for editing all content without touching code.

**[SPEC.md](SPEC.md) is the source of truth.** Requirements, architecture, the delivery plan and the runbook all live there.

## Stack

Next.js 16 (App Router, Cache Components) · TypeScript (strict) · Tailwind CSS v4 · shadcn/ui · Neon Postgres + Drizzle · Vercel Blob · deployed on Vercel. Full list: SPEC §6.

## Local setup

Requirements: Node 24 (see `.nvmrc`) and pnpm. pnpm is enabled through corepack. If `corepack enable` fails with a permissions error on Windows, run `corepack enable pnpm --install-directory "$env:APPDATA\npm"` instead.

```bash
pnpm install
cp .env.example .env.local   # then fill in values (SPEC §21.1)
pnpm dev                     # http://localhost:3000
```

## Scripts

| Command                     | What it does                               |
| --------------------------- | ------------------------------------------ |
| `pnpm dev`                  | Dev server                                 |
| `pnpm build` / `pnpm start` | Production build / serve it                |
| `pnpm lint`                 | ESLint                                     |
| `pnpm typecheck`            | Generate route types, then `tsc --noEmit`  |
| `pnpm test`                 | Unit tests (Vitest, `tests/unit`)          |
| `pnpm test:e2e`             | End-to-end tests (Playwright, `tests/e2e`) |
| `pnpm format`               | Prettier                                   |

## Deploying and everyday use

See SPEC §20 (Runbook): one-time Vercel setup, adding projects, replacing the resume, backups, and recovery.
