<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project rules

- **Read [SPEC.md](SPEC.md) §19 (Guardrails for AI coding agents) before any change.** SPEC.md is the source of truth; if code and spec disagree, the spec wins or is updated first in the same change.
- Work one phase at a time (SPEC §15), in order.
- Before claiming done: `pnpm lint && pnpm typecheck && pnpm test` (and `pnpm build`) must pass.
