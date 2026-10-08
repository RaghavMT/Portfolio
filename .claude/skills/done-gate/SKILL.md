---
name: done-gate
description: Use in this portfolio repo before saying any task, fix, or phase is done, working, or passing, and before committing it.
---

# Done gate (SPEC §16.3)

Nothing is "done" without pasted evidence. If a check couldn't run, say so and why.

## Always

1. Run, and keep the output:
   ```
   pnpm lint; pnpm typecheck; pnpm test; pnpm build
   ```
   (PowerShell: check `$LASTEXITCODE` after each.) Run `pnpm test:e2e` too when a touched flow has E2E coverage.
2. Hygiene, with Grep over `src/`, `scripts/`, `tests/`:
   - no `console.log` (use the logger helper)
   - no secrets/tokens/hashes; no `.env*` staged except `.env.example` (`git status`)
   - no hard-coded personal content in components (it belongs in the DB / `content/seed.json`)
   - no `dangerouslySetInnerHTML` except the theme no-flash script; no `rehype-raw`
   - no new dependency outside SPEC §6.1 without a §18 row
3. Read your own `git diff` line by line: inverted conditions, empty/null/duplicate edge cases, swallowed errors, `any` without a `// reason:` comment.

## UI changes also need

- Run it (`pnpm dev` or build + start) and look at 375 px and 1440 px, light and dark, keyboard-only (visible focus, logical order).
- Public pages: no DB hit per request (cached), minimal client JS.

## Then

- Tick §15 boxes, add §18 rows if needed, and update `.claude/notes/progress.md` with the evidence.
- Commit + push via `push-progress`.
