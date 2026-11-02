# Varianto: Instructions for Claude

Varianto is a free, open-source, local-first chess opening trainer (GPL-3.0). See `.md.local/varianto-spec.md` for goals and MVP scope, and `.md.local/architecture.md` for the stack.

## Language
- Everything in the repo is in English: code, identifiers, comments, commit messages, docs, and UI text.
- Reply to the user in the language they write in. The user currently writes in Thai, so reply in Thai.

## Skills (required)
- **Use superpowers skills at all times.** Before doing anything (including asking questions or exploring code), check whether a relevant skill applies, invoke it via the Skill tool, and follow it.
- New features or behaviour changes: `superpowers:brainstorming` first, then `superpowers:writing-plans`.
- Writing code or fixing bugs: `superpowers:test-driven-development` (the test must fail first). Use `superpowers:systematic-debugging` when something breaks.
- Before claiming completion: `superpowers:verification-before-completion`. Run the commands and read the output.

## Workflow
- TDD: write the test in `src/**/*.test.ts` first, then the implementation.
- Keep the domain separate from the UI: `src/domain/` must not import React or the DOM.
- Domain functions are immutable: return a new repertoire and never mutate the input.
- Before saying work is done, all three must pass: `npx vitest run`, `npm run build`, `npm run lint`.

## Git
- **Commit often, in small pieces.** Make one commit per logical step: a failing test, then its passing implementation, then a refactor or doc change. Do not batch unrelated changes into one commit. The user has asked for this granularity.
- Each commit must leave `npx vitest run` and `npm run build` passing. A red test commit is allowed only when it is the failing-test step of TDD, and its message must say so (for example, `Add failing test for ...`).
- Commit messages are short, imperative, and in English, with a subject line under 72 characters.
- **Push only when the user asks.** Committing alone does not need a request; pushing does.
- Main branch is `main`. The repo is private at github.com/yaminbkk/Varianto.
- End commit messages with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- End PR descriptions with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

## Tooling and Node
- The project pins Node 22.23.4 (`.node-version`). The default shell uses `/usr/bin/node` 22.23.1, which is fine for Vite and Vitest.
- To run with 22.23.4: `~/.local/share/fnm/fnm exec --using=22.23.4 <cmd>`.
- ts-fsrs needs Node 24 for 6.x, so we stay on 5.4.2.

## Prohibitions
- Do not decompile or copy code from ChessReps.
- Guest mode is the default and must work fully without an account: all data in IndexedDB, no network calls.
- Accounts are optional. A logged-in user syncs to Supabase (decided 2026-11-03). Supabase is the only backend; do not add any other.
- App code talks to storage only through the `RepertoireStore` interface, so guest (Dexie) and login (Supabase) stay interchangeable.
- Do not add analytics or trackers.
- Do not add dependencies whose license is incompatible with GPL-3.0.
- Sample repertoires must be created by us. Do not use course content from other people.

## Current status
- Done: scaffold; `domain/repertoire` (commit `45d945b`); `domain/pgn` (commit `170b1ee`).
- In progress: guest `storage` with Dexie, the `RepertoireStore` interface, and a JSON export/import round-trip (Phase 1, item 4). Design: `docs/superpowers/specs/2026-11-03-storage-design.md`.
- Later: login with Supabase sync, as its own brainstorm and design (auth, Row Level Security, moving guest data into an account).
