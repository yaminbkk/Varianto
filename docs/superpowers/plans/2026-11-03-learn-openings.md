# Learn Mode for Every Opening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a learner study every opening and variation in the library as a guided session: they play their own side, the opponent replies, mistakes are corrected without penalty, and progress is saved on the device.

**Architecture:** A pure lesson engine in `src/domain/learn/` takes one line (a list of SAN moves) and the learner's side. Courses are the library grouped by family name. Progress lives behind a new `ProgressStore` (Dexie table). Three new pages (`#/learn`, course, session) reuse the existing `Board`.

**Tech Stack:** React, TypeScript, Vite, Vitest, chess.js, chessground, Dexie, fake-indexeddb for tests. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-03-learn-openings-design.md`

## Global Constraints

- Everything in the repo is English. `src/domain/` must not import React or the DOM; domain functions are immutable and never mutate their input.
- Guest mode works fully offline; no network calls, no analytics, no new dependencies.
- `RepertoireStore` is not changed. Progress goes through a new `ProgressStore` interface.
- TDD: the failing test is committed first (message `Add failing test for ...`), then the implementation. Each commit leaves `npx vitest run` and `npm run build` passing, except a failing-test commit.
- Before claiming completion: `npx vitest run`, `npm run build`, `npm run lint` all pass.
- Learn pages and data load as separate chunks; do not import the library into the main bundle.
- Commit footer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Depth levels by plies (spec): Essentials 7 or fewer, Advanced 11 or fewer, Full all.

## Deferred from the spec

- Including progress in the JSON export/import (`src/storage/exchange.ts`) is not in this plan: it needs an export-format version bump and its own design. Progress stays in IndexedDB only. Recorded as a ruling in the ledger.
- The lesson engine takes a plain list of SAN moves, not a repertoire tree. The spec's in-memory course tree is not needed for a line-by-line session; a repertoire line is also a SAN list, so teaching a user's repertoire later still fits.

## Review Focus

- A course with one line (40 families) or whose lines are all short: depth choices collapse to the distinct ones; the page does not show three identical buttons.
- Learner is Black and the line is a single ply (`1. e4`): the learner has no move in it, so the line is excluded for that side, never offered as an empty session.
- Learner is Black: the opponent's first move is played automatically when the session starts.
- Last move of a line belongs to the opponent: after the learner's final move the opponent's reply is applied and the session finishes in the same step.
- Wrong move, Undo, then the right move: the line can still finish and is recorded as learned; Solve marks the line as not learned.
- Progress survives reload, and `learnedCounts` reports counts for all courses in one call.

---

### Task 1: Courses

**Files:**

- Create: `src/domain/learn/courses.ts`
- Test: `src/domain/learn/courses.test.ts`

**Interfaces:**

- Consumes: `OpeningLine`, `keyIndex` (`src/domain/openings/key.ts`), `sanSequence` (`src/domain/openings/parse.ts`).
- Produces:
  - `type CourseLine = { key: string; line: OpeningLine; plies: number }`
  - `type Course = { id: string; name: string; lines: CourseLine[]; ecoFrom: string; ecoTo: string }`
  - `courseName(openingName: string): string` returns the text before the first colon, trimmed.
  - `coursesFrom(lines: readonly OpeningLine[]): Course[]` sorted by name; course `id` is the slug of the name; line `key` comes from `keyIndex`; `plies` is the SAN count.

- [ ] **Step 1: Write the failing tests:** `courseName('Italian Game: Giuoco Piano')` is `Italian Game`; `courseName('Zukertort Opening')` is itself; `coursesFrom` on three fixture lines (two Italian Game variants, one French Defense) returns two courses with `id` `italian-game` and `french-defense`, the Italian one holding two lines with unique keys, `ecoFrom`/`ecoTo` being the lowest and highest ECO; over the real library: 150 courses, unique ids, line counts summing to 3,865, and the course named "Italian Game" has 187 lines.
- [ ] **Step 2: Run** `npx vitest run src/domain/learn/courses.test.ts`. Expected: FAIL, module missing. Commit `Add failing test for courses`.
- [ ] **Step 3: Implement** `courseName` and `coursesFrom` in `courses.ts`.
- [ ] **Step 4: Run** the test. Expected: PASS. Commit `Add courses grouped by opening family`.

---

### Task 2: Depth, side, and line ordering

**Files:**

- Create: `src/domain/learn/depth.ts`
- Test: `src/domain/learn/depth.test.ts`

**Interfaces:**

- Consumes: `Course`, `CourseLine` (Task 1), `Color` (`src/domain/repertoire/tree.ts`).
- Produces:
  - `type Depth = 'essentials' | 'advanced' | 'full'`; `DEPTH_MAX_PLIES: Record<Depth, number>` with `essentials: 7`, `advanced: 11`, `full: Infinity`.
  - `learnerMoves(plies: number, side: Color): number` — how many of the line's plies the learner plays (White plays plies 1, 3, ...; Black plies 2, 4, ...).
  - `linesFor(course: Course, depth: Depth, side: Color): CourseLine[]` — lines within the depth where `learnerMoves(...) >= 1`, ordered by `plies` ascending then library order.
  - `depthChoices(course: Course, side: Color): Depth[]` — the depths whose `linesFor` sets differ from the previous depth's (always includes the last needed one; an empty list when there are no lines for that side).

- [ ] **Step 1: Write the failing tests:** `learnerMoves(5, 'white')` is 3 and `(5, 'black')` is 2; `(1, 'black')` is 0; `linesFor` on a fixture course with lines of 3, 7, 8, 11, 12 plies returns 2 for essentials, 4 for advanced, 5 for full, ordered by plies; a 1-ply line is excluded for Black; `depthChoices` for a one-line course is `['full']`, for the fixture is all three, for a course whose lines are all 4 plies is `['full']`.
- [ ] **Step 2: Run** `npx vitest run src/domain/learn/depth.test.ts`. Expected: FAIL. Commit `Add failing test for depth levels`.
- [ ] **Step 3: Implement** `depth.ts`. The collapsed choice is labelled by the largest depth, so a one-level course exposes `full`.
- [ ] **Step 4: Run.** Expected: PASS. Commit `Add depth levels and line ordering`.

---

### Task 3: Move prompts

**Files:**

- Create: `src/domain/learn/prompt.ts`
- Test: `src/domain/learn/prompt.test.ts`

**Interfaces:**

- Consumes: chess.js only.
- Produces: `promptFor(san: string): string` — wording from the SAN alone, e.g. `e4` gives `Play pawn to e4.`, `Nf3` gives `Play knight to f3.`, `Bxc6` gives `Capture on c6 with the bishop.`, `exd5` gives `Capture on d5 with the e-pawn.`, `O-O` gives `Castle kingside.`, `O-O-O` gives `Castle queenside.`, `e8=Q` gives `Play pawn to e8 and promote to a queen.`, trailing `+` or `#` adds ` This gives check.` or ` This is checkmate.`; `Nbd7` gives `Play the b-file knight to d7.`; `N1f3` gives `Play the knight on rank 1 to f3.`

- [ ] **Step 1: Write the failing tests** covering exactly the examples above.
- [ ] **Step 2: Run** `npx vitest run src/domain/learn/prompt.test.ts`. Expected: FAIL. Commit `Add failing test for move prompts`.
- [ ] **Step 3: Implement** `promptFor` by parsing the SAN with a regular expression; the wording is the one in the tests.
- [ ] **Step 4: Run.** Expected: PASS. Commit `Add move prompts`.

---

### Task 4: Lesson engine

**Files:**

- Create: `src/domain/learn/lesson.ts`
- Test: `src/domain/learn/lesson.test.ts`

**Interfaces:**

- Consumes: `Color`, `openingPositions`/`START_FEN` (`src/domain/openings/positions.ts`) for FENs, `promptFor` (Task 3).
- Produces:
  - `type Lesson = { sans: string[]; fens: string[]; side: Color; cursor: number; solved: boolean; finished: boolean }` where `fens[i]` is the position before ply `i` (`fens.length === sans.length + 1`).
  - `startLesson(sans: readonly string[], side: Color): Lesson` — applies the opponent's first move when the learner is Black.
  - `type Outcome = { kind: 'correct' } | { kind: 'wrong'; expected: string } | { kind: 'invalid' }`
  - `submitMove(lesson: Lesson, san: string | null): { lesson: Lesson; outcome: Outcome }` — `null` (illegal drop) gives `invalid` with the lesson unchanged; the right SAN advances the cursor by one and applies the opponent's reply if any; `finished` is true when the cursor reaches the end.
  - `undoMove(lesson: Lesson): Lesson` — returns to the learner's previous turn (undoing the learner move and the opponent reply); a no-op at the first learner turn.
  - `hintSquare(lesson: Lesson): string | null` — the from-square of the expected move, found by matching the SAN against legal moves at `fens[cursor]`; `null` when finished.
  - `solve(lesson: Lesson): Lesson` — plays the expected move as `submitMove` would, and sets `solved: true`.
  - `currentPrompt(lesson: Lesson): string | null` — `promptFor` of the expected move.

- [ ] **Step 1: Write the failing tests:** for `['e4','e5','Nf3','Nc6','Bc4']` as White: start cursor is 0 and the prompt is `Play pawn to e4.`; `submitMove(…,'e4')` gives `correct`, cursor 2, `finished` false; the final `Bc4` gives cursor 5 and `finished` true (no reply exists); as Black the lesson starts at cursor 1 after `e4` is applied; a line ending on the opponent's move (`['e4','e5']` as White) finishes right after the learner's `e4` with cursor 2; a wrong SAN gives `wrong` with `expected`, lesson deep-equal to the input; `null` gives `invalid`; `undoMove` after one correct move returns to cursor 0, and after a second returns to cursor 2; `hintSquare` at the start is `e2`; `solve` sets `solved` true and advances; no function mutates its input (deep-freeze the input in one test).
- [ ] **Step 2: Run** `npx vitest run src/domain/learn/lesson.test.ts`. Expected: FAIL. Commit `Add failing test for the lesson engine`.
- [ ] **Step 3: Implement** `lesson.ts`. Build `fens` once with chess.js in `startLesson`.
- [ ] **Step 4: Run.** Expected: PASS. Commit `Add lesson engine`.

---

### Task 5: Next line

**Files:**

- Create: `src/domain/learn/nextLine.ts`
- Test: `src/domain/learn/nextLine.test.ts`

**Interfaces:**

- Consumes: `Course`, `CourseLine`, `Depth`, `linesFor` (Task 2).
- Produces: `nextLine(course: Course, depth: Depth, side: Color, learned: ReadonlySet<string>): CourseLine | null` — the first line of `linesFor(course, depth, side)` whose key is not in `learned`; `courseProgress(course, depth, side, learned): { done: number; total: number }`.

- [ ] **Step 1: Write the failing tests:** returns the shortest unlearned line; skips learned keys; `null` when all are learned; `courseProgress` counts only lines inside the depth and side.
- [ ] **Step 2: Run** `npx vitest run src/domain/learn/nextLine.test.ts`. Expected: FAIL. Commit `Add failing test for next line`.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** Expected: PASS. Commit `Add next line selection`.

---

### Task 6: Progress storage

**Files:**

- Create: `src/storage/progress.ts` (interface), `src/storage/dexieProgress.ts`
- Modify: `src/storage/db.ts` (version 2 adds the `learned` table; version 1 stays)
- Test: `src/storage/dexieProgress.test.ts`

**Interfaces:**

- Produces: `interface ProgressStore { markLearned(courseId: string, lineKey: string): Promise<void>; learnedLines(courseId: string): Promise<Set<string>>; learnedCounts(): Promise<Map<string, number>>; reset(courseId: string): Promise<void> }` and `class DexieProgressStore implements ProgressStore` taking a `VariantoDb`. Table `learned` has primary key `[courseId+lineKey]` and index `courseId`.

- [ ] **Step 1: Write the failing tests** (with `import 'fake-indexeddb/auto'`, as `dexieStore.test.ts` does): marking is idempotent; `learnedLines` is per course; `learnedCounts` counts per course in one call; `reset` removes only that course; an existing database at version 1 with a repertoire still opens and keeps its data after the upgrade (create it with a version-1 `VariantoDb` subclass, then open the current one).
- [ ] **Step 2: Run** `npx vitest run src/storage/dexieProgress.test.ts`. Expected: FAIL. Commit `Add failing test for progress storage`.
- [ ] **Step 3: Implement** the interface, the Dexie class, and the schema version 2.
- [ ] **Step 4: Run** `npx vitest run`. Expected: all pass, including existing storage tests. Commit `Add progress storage`.

---

### Task 7: Routes, progress context, and catalog

**Files:**

- Create: `src/ui/ProgressContext.tsx`, `src/ui/useProgress.ts`, `src/ui/pages/LearnCatalogPage.tsx`, `src/ui/pages/CoursePage.tsx` (heading-only stub), `src/ui/pages/LessonPage.tsx` (heading-only stub), `src/ui/useCourses.ts`
- Modify: `src/ui/paths.ts`, `src/ui/paths.test.ts`, `src/ui/router.tsx`, `src/App.tsx`, `src/main.tsx`, `src/index.css`

**Interfaces:**

- Produces: `learnPath = '/learn'`, `coursePath(id: string)` → `/learn/<id>`, `lessonPath(id: string, depth: Depth, side: Color)` → `/learn/<id>/play?depth=<depth>&side=<side>`; `ProgressProvider` and `useProgress(): ProgressStore`; `useCourses()` returns `{ status: 'loading' } | { status: 'failed'; retry } | { status: 'ready'; courses: Course[] }`, loading the library as its own chunk.
- `App` receives `progress: ProgressStore` and wraps the router outlet in `ProgressProvider`; `main.tsx` builds it with `new DexieProgressStore(db)`, sharing the one `VariantoDb` with the repertoire store.

- [ ] **Step 1: Write the failing test** in `paths.test.ts`: `coursePath('italian-game')` is `/learn/italian-game` and `lessonPath('italian-game','advanced','black')` is `/learn/italian-game/play?depth=advanced&side=black`.
- [ ] **Step 2: Run** `npx vitest run src/ui/paths.test.ts`. Expected: FAIL. Commit `Add failing test for learn paths`.
- [ ] **Step 3: Implement** paths, context, `useCourses`, routes, the two stub pages, and the catalog page: search by name or ECO, one link card per course showing name, ECO range, line count, and `N learned` from `learnedCounts`; load failure shows an alert with Try again. Follow the patterns of `OpeningsPage.tsx`.
- [ ] **Step 4: Run** `npx vitest run && npm run build && npm run lint`. Expected: PASS. Commit `Add learn catalog page`.

---

### Task 8: Course page

**Files:**

- Modify: `src/ui/pages/CoursePage.tsx`, `src/index.css`

**Interfaces:**

- Consumes: `useCourses`, `depthChoices`, `courseProgress`, `nextLine`, `useProgress`, `lessonPath`, the optional description from `opening-descriptions.json` (`description` lookup by the course's own opening key when present).
- Produces: the page at `#/learn/<id>`: name, ECO range, description when present, side choice (White/Black, using `SideField`), depth choice (radio group using `depthChoices`), `N of M learned` for the chosen depth and side, and a **Start** button (**Continue** when some lines are learned, **Review** text only when all are learned) linking to the session. Unknown course shows "Course not found" with a link to the catalog. A **Reset progress** button asks for confirmation inside the page (no `window.confirm`).

- [ ] **Step 1: Implement** the page.
- [ ] **Step 2: Run** `npx vitest run && npm run build && npm run lint`. Expected: PASS. Commit `Add course page`.

---

### Task 9: Lesson session page

**Files:**

- Modify: `src/ui/pages/LessonPage.tsx`, `src/index.css`
- Create: `src/ui/Board.tsx` additions only if needed (`hintSquare` highlight via an optional `hint?: string` prop); test file `src/ui/hintConfig.test.ts` if a pure helper is extracted.

**Interfaces:**

- Consumes: `Board` (`canMove` true, `orientation` = learner's side), `sanFromSquares`, `startLesson`, `submitMove`, `undoMove`, `hintSquare`, `solve`, `currentPrompt`, `nextLine`, `courseProgress`, `useProgress`, `coursePath`, `lessonPath`.
- Produces: the page at `#/learn/<id>/play?depth=&side=`. On mount it picks the next unlearned line with `nextLine` and starts a lesson. Layout: board on the left; on the right the prompt, the opponent's last reply ("Black played e5."), a progress bar (`cursor` of `sans.length` plies), and buttons **Hint** (highlights the from-square, then the button becomes **Solve**), **Undo move**, **Try again** (visible after a wrong move; dismisses the message). A wrong move shows "That is a fine move, but this line plays <expected>." and snaps the board back. On `finished`, record `markLearned` unless `solved`, and show "Line learned" (or "Line finished" when `solved`) with **Next line** and **Back to course**. When no unlearned line remains: "Course complete at this depth" with a link back.
- Invalid or missing parameters (`depth`, `side`, unknown course) show a message with a link to the catalog, never a blank page.

- [ ] **Step 1: Implement** the page; keep the lesson in `useState` and call only the engine functions for transitions. The board remounts (key increment) after an invalid or wrong drop, as `BoardPage.tsx` does.
- [ ] **Step 2: Run** `npx vitest run && npm run build && npm run lint`. Expected: PASS. Commit `Add lesson session page`.

---

### Task 10: Entry points

**Files:**

- Modify: `src/ui/pages/HomePage.tsx`, `src/ui/pages/OpeningPage.tsx`

- [ ] **Step 1: Implement** a **Learn openings** link on the home page next to **Browse openings**, and a **Learn this opening** link on each opening page pointing at `coursePath(<courseId of that opening>)` (use `courseName` and the course id slug from Task 1).
- [ ] **Step 2: Run** `npx vitest run && npm run build && npm run lint`. Expected: PASS. Commit `Link learn mode from home and opening pages`.

---

### Task 11: Final verification

**Files:** none changed unless a check fails.

- [ ] **Step 1: Run** `npx vitest run`. Expected: all test files pass.
- [ ] **Step 2: Run** `npm run build`. Expected: exit code 0, and the learn pages and library are chunks separate from the main bundle.
- [ ] **Step 3: Run** `npm run lint`. Expected: exit code 0 with no warnings.
- [ ] **Step 4: Browser flow with a real mouse** in a clean profile: catalog, search "italian", open the Italian Game course, play a line as White (including a wrong move, Undo, Hint, Solve), then as Black; finish a line and see it counted; reload and confirm progress; check a one-line course and a 375 px viewport. Report each step honestly, including steps not run.
