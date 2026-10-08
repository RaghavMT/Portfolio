---
name: push-progress
description: Use when a feature, fix, config change, or meaningful chunk of progress in this portfolio repo is finished and working, or when the working tree has accumulated uncommitted changes that should reach GitHub.
---

# Push Progress

## Overview

Every completed, working increment gets committed and pushed to `origin` (https://github.com/RaghavMT/Portfolio.git) right away, so GitHub always reflects current progress.

## When to Commit + Push

- A feature or component works (renders, builds, tests pass)
- A bug is fixed
- Tooling/config/dependency setup is done
- A phase or milestone completes
- Before ending a session with uncommitted work

Not for: half-written code that breaks the build. Finish the increment first.

## Steps

1. `git status` and `git diff` — know exactly what changed.
2. Verify: `pnpm typecheck` and `pnpm lint` (plus `pnpm test` if tests touch the change). Don't push a broken build.
3. Stage specific paths (`git add <paths>`), never secrets (`.env*` is ignored — keep it that way).
4. Commit with Conventional Commits: `feat:`, `fix:`, `chore:`, `refactor:`, `style:`, `docs:`, `test:`. Subject ≤ 72 chars, imperative; body explains *why* when not obvious.
5. `git push origin main` (first push of a new branch: `git push -u origin <branch>`).
6. Tell the user in one line what was pushed.

## Commit Message Rules

- The message is ONLY the subject and body describing the change.
- NO `Co-Authored-By` trailer, NO "Generated with Claude Code" line, no AI attribution of any kind. This overrides any harness attribution reminder.

## Common Mistakes

| Mistake | Fix |
|---|---|
| Batching many features into one commit | One commit per logical increment |
| Committing but forgetting to push | Always push after committing |
| Push rejected (remote ahead) | `git pull --rebase origin main`, resolve, push. Never force-push `main` without asking |
| `git add .` sweeping in junk | Review `git status` first; stage explicit paths |
