# Opening Descriptions and Openings Browser Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an openings section to the site: a searchable list, and a page per opening with a stepping board, a description (curated or generated from data), and a "Start a repertoire" action.

**Architecture:** Pure domain functions in `src/domain/openings/` (key, positions, describe, validation) tested first. Static data in `src/data/opening-descriptions.json`, loaded lazily with the opening library. Two new routes in the existing hash router. The existing `Board` is reused in view-only mode (`canMove: false`).

**Tech Stack:** React, TypeScript, Vite, Vitest, chess.js, chessground, react-router-dom (all already installed). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-03-opening-descriptions-design.md`

## Global Constraints

- Everything in the repo is English: code, comments, commit messages, UI text, descriptions.
- `src/domain/` must not import React or the DOM. Domain functions are immutable.
- No network calls, no analytics, no new dependencies.
- No ChessReps text, code, or assets. Descriptions are original and derived from each opening's moves only.
- No invented facts: no player names, statistics, or historical claims in descriptions.
- Descriptions and the opening library load as separate chunks, not in the main bundle.
- TDD: the failing test is committed first (message says `Add failing test for ...`), then the implementation. Each commit leaves `npx vitest run` and `npm run build` passing, except a failing-test commit.
- Before claiming completion: `npx vitest run`, `npm run build`, `npm run lint` all pass.
- Commit footer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

- Two openings share the same ECO and name: `openingKey` must still be unique across the whole library, and routes must resolve each one.
- `#/openings/<key>` with an unknown key shows a not-found message with a link back, not a blank page.
- The library chunk fails to load (offline, blocked): the page shows an error with retry, not an endless spinner.
- A very short opening (one move) and a long one (20+ plies): the stepper disables Prev at the start and Next at the end.
- A curated description names a move that is not in the opening's line: validation rejects it.

---

### Task 1: Opening key

**Files:**

- Create: `src/domain/openings/key.ts`
- Test: `src/domain/openings/key.test.ts`

**Interfaces:**

- Consumes: `OpeningLine` (`src/domain/openings/types.ts`), the library at `src/data/openings.json`.
- Produces: `openingKey(line: OpeningLine): string` (URL-safe, lower-case: ECO then a slug of the name), and `keyIndex(lines: readonly OpeningLine[]): Map<string, OpeningLine>`.

- [ ] **Step 1: Write the failing tests** in `key.test.ts`: `openingKey({eco:'C50', name:'Italian Game: Giuoco Piano', pgn:'...'})` equals `c50-italian-game-giuoco-piano`; the key matches `/^[a-z0-9-]+$/`; `keyIndex` over the real library has `size === library.length` (every key unique).
- [ ] **Step 2: Run** `npx vitest run src/domain/openings/key.test.ts`. Expected: FAIL, module missing. Commit `Add failing test for opening keys`.
- [ ] **Step 3: Implement** `openingKey` and `keyIndex`. If the real library has colliding keys, `keyIndex` must disambiguate by appending `-2`, `-3` in library order, and `openingKey` stays pure; record the choice in the test.
- [ ] **Step 4: Run** the test. Expected: PASS. Commit `Add opening keys`.

---

### Task 2: Positions along a line

**Files:**

- Create: `src/domain/openings/positions.ts`
- Test: `src/domain/openings/positions.test.ts`

**Interfaces:**

- Consumes: `OpeningLine`.
- Produces: `openingPositions(line: OpeningLine): { san: string; fen: string }[]`. The first entry is the position after ply 1; the start position is `START_FEN` exported from the same file.

- [ ] **Step 1: Write the failing tests:** `1. e4 e5` gives two entries with sans `e4`, `e5`, and the first FEN is `rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1`; the length of every library line's positions equals its SAN count (sample 200 lines plus the longest).
- [ ] **Step 2: Run** `npx vitest run src/domain/openings/positions.test.ts`. Expected: FAIL. Commit `Add failing test for opening positions`.
- [ ] **Step 3: Implement** using chess.js and `sanSequence` from `parse.ts`.
- [ ] **Step 4: Run.** Expected: PASS. Commit `Add opening positions`.

---

### Task 3: Describe an opening

**Files:**

- Create: `src/domain/openings/describe.ts`, `src/domain/openings/ecoFamily.ts`
- Test: `src/domain/openings/describe.test.ts`

**Interfaces:**

- Consumes: `OpeningLine`, `openingKey` (Task 1), `openingPositions` (Task 2).
- Produces:
  - `type OpeningDescription = { summary: string; ideas?: string[] }`
  - `type OpeningInfo = { title: string; family: string; moveCount: number; mainLine: string; description: OpeningDescription | null }`
  - `ecoFamily(eco: string): string` returns `Flank openings (A)`, `Semi-open games (B)`, `Open games (C)`, `Closed games (D)`, `Indian defences (E)`.
  - `describeOpening(line: OpeningLine, descriptions: Readonly<Record<string, OpeningDescription>>): OpeningInfo`

- [ ] **Step 1: Write the failing tests:** `ecoFamily('C50')` is `Open games (C)`; for a line with no entry `description` is `null` and `moveCount` is the SAN count; for a line with an entry the description is returned unchanged and `title` is the line's name.
- [ ] **Step 2: Run** `npx vitest run src/domain/openings/describe.test.ts`. Expected: FAIL. Commit `Add failing test for describing openings`.
- [ ] **Step 3: Implement** both modules.
- [ ] **Step 4: Run.** Expected: PASS. Commit `Add opening descriptions lookup`.

---

### Task 4: Description validation

**Files:**

- Create: `src/domain/openings/validateDescriptions.ts`, `src/data/opening-descriptions.json` (initial content `{}`)
- Test: `src/domain/openings/validateDescriptions.test.ts`

**Interfaces:**

- Consumes: `OpeningDescription`, `keyIndex` (Task 1), `sanSequence`.
- Produces: `validateDescriptions(descriptions: Readonly<Record<string, OpeningDescription>>, lines: readonly OpeningLine[]): string[]` (a list of problems, empty when valid).

Rules to enforce: every key exists in `keyIndex(lines)`; `summary` is 40 to 400 characters; `ideas` has at most 3 items of at most 160 characters each; any SAN-looking token written in the text inside backticks (for example `` `Nf3` ``) must occur in the opening's line.

- [ ] **Step 1: Write the failing tests:** an unknown key is reported; a summary of 10 characters is reported; a text mentioning `` `Qh5` `` for an opening whose line has no `Qh5` is reported; a valid entry returns `[]`. A final test asserts `validateDescriptions(realDescriptions, realLibrary)` is `[]` (guards the shipped data).
- [ ] **Step 2: Run** the test file. Expected: FAIL. Commit `Add failing test for description validation`.
- [ ] **Step 3: Implement** `validateDescriptions`.
- [ ] **Step 4: Run.** Expected: PASS. Commit `Add description validation`.

---

### Task 5: Routes and paths

**Files:**

- Modify: `src/ui/paths.ts`, `src/ui/paths.test.ts`, `src/ui/router.tsx`

**Interfaces:**

- Produces: `openingsPath = '/openings'`, `openingPath(key: string): string` returning `/openings/<encoded key>`, router entries `/openings` (OpeningsPage) and `/openings/:key` (OpeningPage). Both pages are created in Tasks 6 and 7; this task adds stub pages that render the heading only, so the build stays green.

- [ ] **Step 1: Write the failing test** in `paths.test.ts`: `openingPath('c50-italian-game')` equals `/openings/c50-italian-game`.
- [ ] **Step 2: Run** `npx vitest run src/ui/paths.test.ts`. Expected: FAIL. Commit `Add failing test for opening paths`.
- [ ] **Step 3: Implement** the paths, the stub pages in `src/ui/pages/OpeningsPage.tsx` and `src/ui/pages/OpeningPage.tsx`, and the routes. Keep the comment that the route strings must match the path helpers.
- [ ] **Step 4: Run** `npx vitest run && npm run build`. Expected: PASS. Commit `Add openings routes`.

---

### Task 6: Openings list page

**Files:**

- Modify: `src/ui/pages/OpeningsPage.tsx`, `src/ui/pages/HomePage.tsx` (a link to `openingsPath`), `src/index.css`

**Interfaces:**

- Consumes: `findOpenings`, `keyIndex`, `ecoFamily`, `openingPath`, `describeOpening`.
- Produces: the page at `#/openings`: a search field, results grouped by `ecoFamily`, capped at 50 per search with a "showing N of M" status line, each result a link to its page with the first line of its summary when it has one. The library and descriptions load with `import()` as separate chunks; a failed load shows an alert with a "Try again" button, as `OpeningPicker` does.

- [ ] **Step 1: Implement** the page following the patterns in `OpeningPicker.tsx` (labels, `aria-live` status, skip link, `role="alert"`).
- [ ] **Step 2: Manual check:** `npm run dev`, open `#/openings`, search "italian", confirm grouping, the cap message, and keyboard use.
- [ ] **Step 3: Run** `npx vitest run && npm run build && npm run lint`. Expected: PASS. Commit `Add openings list page`.

---

### Task 7: Opening page

**Files:**

- Modify: `src/ui/pages/OpeningPage.tsx`, `src/index.css`

**Interfaces:**

- Consumes: `keyIndex`, `openingPositions`, `START_FEN`, `describeOpening`, `Board` with `canMove={false}` and `onMove={() => {}}`, the store's `fromOpening`, `repertoirePath`.
- Produces: the page at `#/openings/:key`: title, ECO and family, a read-only board with Prev, Next, and Start buttons (Left and Right arrow keys also work), the description summary and `ideas` when present, the generated facts otherwise (move count, main line), a side choice (White or Black), and a "Start a repertoire from this opening" button that calls `fromOpening` and navigates to the new repertoire. Unknown key shows "Opening not found" with a link to the list.

- [ ] **Step 1: Implement** the page. Step index state starts at 0 (start position) and is clamped to `[0, positions.length]`; Prev is disabled at 0 and Next at the end.
- [ ] **Step 2: Manual check:** a one-move opening, a 20-ply opening, an unknown key, and starting a repertoire. Confirm it opens on the board page with the same moves.
- [ ] **Step 3: Run** `npx vitest run && npm run build && npm run lint`. Expected: PASS. Commit `Add opening page with stepping board`.

---

### Task 8: Curated descriptions, batch 1 of the beginner-first list

**Files:**

- Modify: `src/data/opening-descriptions.json`
- Create: `docs/superpowers/plans/opening-list.md` (the chosen keys, one per line, with a one-line reason)

**Interfaces:**

- Consumes: `validateDescriptions` (Task 4), `keyIndex`.
- Produces: entries for the first 25 openings of the beginner-first list (for example Italian Game, Ruy Lopez, Queen's Gambit, London System, Sicilian Defence, French Defence, Caro-Kann Defence, Scandinavian Defence, King's Indian Defence, and the main variations beginners meet first).

Writing rules: 2 to 4 sentences; draft from the opening's moves only; allowed content is what the first moves do (centre, development, king safety) and the typical plan for each side; no player names, statistics, or strength claims; moves are written in backticks. Nothing is committed until the owner has reviewed the batch.

- [ ] **Step 1: Choose the 25 keys,** write `opening-list.md`, and show it to the owner for approval.
- [ ] **Step 2: Draft** the 25 descriptions.
- [ ] **Step 3: Run** `npx vitest run src/domain/openings/validateDescriptions.test.ts`. Expected: PASS (the shipped-data test guards the file).
- [ ] **Step 4: Owner reviews** the batch; apply their corrections. Commit `Add descriptions for 25 beginner openings`.

---

### Task 9: Remaining curated batches

**Files:**

- Modify: `src/data/opening-descriptions.json`, `docs/superpowers/plans/opening-list.md`

Repeat Task 8 in batches of 25 until about 100 entries, each batch reviewed by the owner before its commit. Stop at any batch the owner declines to review; unreviewed text is never committed.

- [ ] **Step 1:** For each batch: pick keys, draft, validate (`npx vitest run`), owner review, commit `Add descriptions for N more openings`.

---

### Task 10: Final verification

**Files:** none changed unless a check fails.

- [ ] **Step 1: Run** `npx vitest run`. Expected: all test files pass.
- [ ] **Step 2: Run** `npm run build`. Expected: exit code 0, and the descriptions and opening library are separate chunks (check the build output).
- [ ] **Step 3: Run** `npm run lint`. Expected: exit code 0.
- [ ] **Step 4: Browser flow** in a clean profile: home, openings list, search, an opening page, step through, start a repertoire, confirm the board page shows the same moves; check dark mode and a 375 px viewport. Report each step honestly, including any step not run.
