---
name: spec-phase
description: Use when starting or continuing any task from SPEC.md §15 (a phase checkbox) in this portfolio repo, before writing code for it.
---

# Spec phase task loop

SPEC.md drives the work. This is SPEC §19.1 turned into steps.

## Steps

1. **Locate.** Find the task in SPEC §15 and confirm every earlier phase's AC passed (see `.claude/notes/progress.md`). Don't start a later phase early.
2. **Re-read.** Read the spec sections the task touches: data model §7, FR-PUB §8, FR-ADM §9, uploads §10, security §12, NFR §13, structure §14. Use Grep on SPEC.md for the requirement IDs.
3. **Plan in 3–6 bullets:** what changes, which files, which requirement IDs it satisfies, and what is out of scope. **Wait for Raghav's reply** unless the task is a typo-sized fix.
4. **Test first** for logic that can be wrong: Zod schemas, slug, format/duration, markdown link sanitising, session, rate-limit, any bug fix. Write the test in `tests/unit/`, run it, and watch it fail before implementing. Layout and styling get checked by running them, not by fake tests.
5. **Implement** with the smallest change that fully meets the AC. Follow §14.1 paths exactly. Admin writes follow the `admin-mutation` skill.
6. **Verify each AC** from §15 with evidence (command output, test names, screenshots). Run the `done-gate` skill.
7. **Record:** tick the §15 checkbox, add §18 rows for any choices made (mark ambiguous ones "assumed"), and update `.claude/notes/progress.md`.
8. **Ship:** follow the `push-progress` skill. Use a Conventional Commit that references requirement IDs, e.g. `feat(admin): project form (FR-ADM-04)`.

## Stop instead of guessing
If the step needs anything on the SPEC §19.2 list (new dependency, destructive migration, prod data, auth/security changes, design direction, third-party service, weakening a test, structure/stack deviation): stop, say what's blocked, and ask.
