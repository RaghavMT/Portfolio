@AGENTS.md

# Working rules for Claude in this repo

## Source of truth

- `SPEC.md` decides everything. Re-read the sections for the current phase before working on it. Anything not in the spec is out of scope until it's added there.
- Before stopping to ask Raghav, check SPEC §19.2 (stop-and-ask list). Never do anything on the SPEC §19.3 list.
- Record non-trivial choices as a new row in SPEC §18 (Decision Log). Never edit old rows; supersede them.

## Workflow

- Per task: use the `spec-phase` skill. Any admin Server Action or admin route handler: use `admin-mutation`. Before saying anything is done: use `done-gate`. After a verified increment: use `push-progress` (commit + push, no AI attribution trailers).
- Commands: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:e2e`.
- Next.js 16 differs from older versions: read `node_modules/next/dist/docs/` before using any Next API. Cache Components is ON (D9): public reads use `'use cache'` + `cacheTag('content')`, and admin mutations call `invalidateContent()` (wraps `updateTag('content')`).
- Packages: anything outside SPEC §6.1 needs a Decision Log row and Raghav's OK first.

## Environment (Windows)

- PowerShell 5.1: no `&&`; chain with `; if ($?) { ... }`. Use the Bash tool for heredocs (e.g. commit messages).
- pnpm comes from corepack, with shims in `%APPDATA%\npm`. Set `COREPACK_ENABLE_DOWNLOAD_PROMPT=0` in non-interactive shells.
- Another Claude session may work in this folder too. Check `git status` / `git log` before committing, and stage explicit paths.

## Notes

- `.claude/notes/progress.md`: phase status, AC evidence, what's blocked on Raghav. Update it at the end of every task.
- `.claude/notes/scratch/`: git-ignored, for throwaway logs and screenshots.
