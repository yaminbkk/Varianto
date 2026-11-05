# Practice and Drill Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Practice mode (FSRS spaced-repetition review of learned lines) and a timed Drill mode (as many learned lines as possible within a time limit), with results stored in progress.

**Architecture:** Two pure domain modules (`review.ts` wraps ts-fsrs; `drill.ts` is a time-injected session state machine). `ProgressStore` gains review-card and drill-result methods, backed by two new Dexie tables (db version 3). One shared board component plays a single line from memory using the existing `domain/learn/lesson.ts`; `PracticePage` and `DrillPage` sit on top of it.

**Tech Stack:** TypeScript, Vitest, React, Dexie, ts-fsrs 5.4.2, chessground.

**Spec:** Decisions made with the user on 2026-11-03: Practice reviews learned lines ordered by FSRS due date; Drill uses all learned lines of the course, shuffled, with one timer for the whole run (1, 3 or 5 minutes, default 3); a wrong move fails that line and moves on; Drill results are stored but do not change FSRS cards; both modes are on the course page.

## Global Constraints

- `src/domain/` must not import React or the DOM. Domain functions are pure and never mutate inputs.
- App code reaches storage only through `ProgressStore`; the interface must not expose Dexie types.
- Guest mode: IndexedDB only, no network calls. No new dependencies (ts-fsrs 5.4.2 is already installed; stay on it).
- Grade mapping: no mistake and no hint = Good; hint used and no mistake = Hard; any mistake or Solve = Again.
- Drill durations: 60_000, 180_000, 300_000 ms. An unlearned line is never practised or drilled.
- Each commit leaves `npx vitest run` and `npm run build` passing, except a failing-test commit whose message says so. Do not stage `src/storage/dexieStore.ts` or `src/ui/store/appStore.test.ts`.

## Review Focus

- A course with no learned lines shows an empty state in both modes and does not crash.
- A learned line with no stored card counts as due now (first review).
- A drill with a single line ends when that line is done, even with time left.
- A drill whose time is already up when checked reports over and records nothing extra.
- Resetting a course also forgets its cards and drill results.

---

### Task 1: FSRS review wrapper

**Files:** Create `src/domain/learn/review.ts`; Test `src/domain/learn/review.test.ts`

**Interfaces:**

- Produces:
  - `type ReviewCard` (alias of ts-fsrs `Card`)
  - `type Grade = 'again' | 'hard' | 'good'`
  - `gradeFor(result: { mistakes: number; hinted: boolean; solved: boolean }): Grade`
  - `schedule(card: ReviewCard | null, grade: Grade, now: Date): ReviewCard`
  - `dueKeys(cards: ReadonlyMap<string, ReviewCard>, learned: ReadonlySet<string>, now: Date): string[]`

- [ ] **Step 1: Failing tests.** `gradeFor`: `{0,false,false}`→good, `{0,true,false}`→hard, `{1,false,false}`→again, `{0,false,true}`→again. `schedule(null,'good',now)` returns a card with `due` after `now`; `'again'` gives an earlier due than `'good'`; the input card is not mutated. `dueKeys`: a learned key with no card is due; a card due in the future is not; an overdue card is due; keys not in `learned` are ignored; order is cards-without-history first, then by earliest due.
- [ ] **Step 2:** Run `npx vitest run src/domain/learn/review.test.ts`; expect FAIL (module missing).
- [ ] **Step 3:** Commit the failing test (message: `Add failing test for FSRS review scheduling`).
- [ ] **Step 4:** Implement with `createEmptyCard`, `fsrs()` and `Rating` from `ts-fsrs`; map grades to `Rating.Again/Hard/Good`; use `f.next(card ?? createEmptyCard(now), now, rating).card`.
- [ ] **Step 5:** Run the file's tests; expect PASS. Commit (`Add FSRS review scheduling for learned lines`).

### Task 2: Drill session

**Files:** Create `src/domain/learn/drill.ts`; Test `src/domain/learn/drill.test.ts`

**Interfaces:**

- Produces:
  - `DRILL_DURATIONS_MS: readonly [60000, 180000, 300000]`, `DEFAULT_DRILL_MS = 180000`
  - `interface DrillState { queue: readonly string[]; index: number; passed: number; failed: number; startedAt: number; durationMs: number }`
  - `startDrill(keys: readonly string[], durationMs: number, startedAt: number, shuffle?: (keys: string[]) => string[]): DrillState`
  - `currentKey(state: DrillState): string | null`
  - `recordLine(state: DrillState, passed: boolean): DrillState`
  - `timeLeftMs(state: DrillState, now: number): number` (never negative)
  - `isOver(state: DrillState, now: number): boolean`
  - `interface DrillResult { passed: number; failed: number; durationMs: number; elapsedMs: number }` and `drillResult(state: DrillState, now: number): DrillResult` (elapsed capped at durationMs)

- [ ] **Step 1: Failing tests.** `startDrill` uses the injected shuffle (identity in tests) and does not mutate `keys`; `recordLine(true)` increments `passed` and advances; `recordLine(false)` increments `failed`; `isOver` is true when time left is 0 or the queue is exhausted (single-line drill ends after that line); `timeLeftMs` clamps at 0; `drillResult.elapsedMs` is capped at `durationMs`; `recordLine` does not mutate its input.
- [ ] **Step 2:** Run the file; expect FAIL. **Step 3:** Commit (`Add failing test for the drill session`).
- [ ] **Step 4:** Implement; default shuffle is Fisher-Yates on a copy. **Step 5:** Tests PASS; commit (`Add the timed drill session`).

### Task 3: Storage for review cards and drill results

**Files:** Modify `src/storage/db.ts` (version 3: `reviews: '[courseId+lineKey], courseId'`, `drills: '++id, courseId'`), `src/storage/progress.ts`, `src/storage/dexieProgress.ts`; Test `src/storage/dexieProgress.test.ts`

**Interfaces:**

- Consumes: `ReviewCard`, `DrillResult` from the domain.
- Produces on `ProgressStore`:
  - `reviewCards(courseId: string): Promise<Map<string, ReviewCard>>` (key = line key)
  - `saveReview(courseId: string, lineKey: string, card: ReviewCard): Promise<void>` (replaces)
  - `addDrillResult(courseId: string, result: DrillResult, at: number): Promise<void>`
  - `drillResults(courseId: string): Promise<(DrillResult & { at: number })[]>` newest first
  - `reset(courseId)` also clears reviews and drills.

- [ ] **Step 1: Failing tests** in `dexieProgress.test.ts` using `freshStore()`: a saved card round-trips with `due` still a `Date`; saving twice keeps one row; courses stay apart; drill results come back newest first; `reset` clears cards and drills; opening a database that already holds version-2 `learned` rows keeps them (create with the old schema, reopen).
- [ ] **Step 2:** Run; expect FAIL. **Step 3:** Commit (`Add failing test for review and drill storage`).
- [ ] **Step 4:** Implement the tables and methods. **Step 5:** Tests PASS, build passes; commit (`Store review cards and drill results`).

### Task 4: Practice and Drill screens

**Files:** Create `src/ui/LinePlayer.tsx`, `src/ui/pages/PracticePage.tsx`, `src/ui/pages/DrillPage.tsx`; Modify `src/ui/paths.ts`, `src/ui/paths.test.ts`, `src/ui/router.tsx`, `src/ui/pages/CoursePage.tsx`

**Interfaces:**

- Produces:
  - `practicePath(courseId: string): string` → `/learn/<id>/practice`; `drillPath(courseId: string): string` → `/learn/<id>/drill`
  - `LinePlayer` props: `{ line: CourseLine; side: Color; allowHint: boolean; onDone: (r: { mistakes: number; hinted: boolean; solved: boolean }) => void; onFail?: () => void }`. Plays the line from memory with `startLesson/submitMove/hintSquare/solve`; counts mistakes; when `onFail` is given, the first mistake calls it instead of showing a retry.

- [ ] **Step 1: Failing tests** for `practicePath` and `drillPath` in `paths.test.ts` (including an id that needs encoding). Run; FAIL; commit (`Add failing test for practice and drill paths`).
- [ ] **Step 2:** Implement the paths; tests PASS; commit.
- [ ] **Step 3:** Build `LinePlayer` (side of a line = `lineOwner(line.plies)`; reuse `Board`).
- [ ] **Step 4:** `PracticePage`: load learned lines and cards, pick `dueKeys`, play the first; on done compute `gradeFor`, `schedule`, `saveReview`, move to the next; empty state when nothing is due or nothing is learned; show "N due".
- [ ] **Step 5:** `DrillPage`: duration picker (60/180/300 s), start, countdown shown with `role="timer"`, `LinePlayer` with `onFail`, `recordLine`, finish screen with passed/failed, `addDrillResult` once, and the previous best passed count. Empty state when no learned lines.
- [ ] **Step 6:** Routes (lazy, like the lesson route) and two buttons on `CoursePage` ("Practice", "Drill") shown when the course has learned lines.
- [ ] **Step 7:** Run `npx vitest run`, `npm run build`, `npm run lint`; all must pass. Check both screens in the browser, including the empty state and a drill running out of time; check 375px width for horizontal scroll. Commit (`Add practice and drill screens`).
