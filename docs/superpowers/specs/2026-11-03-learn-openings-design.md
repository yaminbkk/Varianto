# Learn mode for every opening and variation: design

Date: 2026-11-03 · Status: draft for approval · Size: a project (full design)

## Intent

The owner tried the openings pages and found them passive: pressing Next on a board teaches nothing. They want Varianto to teach openings the way ChessReps does: a guided session where the learner plays their own moves, the opponent replies, mistakes are corrected without penalty, and progress is tracked. The point is that **every opening and every variation in the library can be learned**. Building a personal repertoire stays available but is no longer the main thing.

Behaviour is taken from our own survey notes (`.md.local/chessreps-observations.md`, section 2). No ChessReps text, code, or assets are used.

## Goals

- A catalog of courses covering the whole opening library (150 families, 3,865 lines), each learnable.
- A guided session per course: the learner chooses a side, plays that side's moves, the opponent's moves are played automatically, one line at a time.
- Wrong moves: no penalty, a message naming the recommended move, **Try again** and **Undo move**.
- **Hint** (highlights the piece to move), then **Solve** (plays the move).
- Depth choice, a progress bar per session, "lines learned" per course, and a finish screen with **Next line**.
- Progress stays on the device and survives reload.

## Non-goals and anti-goals

- Not in this phase: Practice, Drill, Time, Arena, puzzles, spaced repetition, engine eval bar, per-move written explanations, streaks, confetti, sound, translations.
- Learning from a user's own repertoire is not built now, though the engine must not rule it out.
- Anti-goal: a session that can dead-end (a line the learner cannot finish), or progress that is lost on reload.
- Anti-goal: copying ChessReps wording. Prompts and messages are our own.

## Constraints

- Everything in the repo is English. `src/domain/` must not import React or the DOM; domain functions are immutable.
- Guest mode works fully offline with data in IndexedDB; no network calls, no analytics.
- Storage goes through interfaces so guest (Dexie) and login (Supabase) stay interchangeable; the existing `RepertoireStore` is not changed.
- Tests first; `npx vitest run`, `npm run build`, `npm run lint` pass before any completion claim.
- Learn code and data load as separate chunks; the main bundle must not grow beyond the router code.

## Data facts (measured from `src/data/openings.json`)

- 3,865 lines; names have the shape `Family` or `Family: Variation, Detail`. Grouping by the text before the first colon gives **150 families**: the largest has 400 lines (Sicilian Defense), then 235, 211, 211, 187 (Italian Game); the median has 5; 40 families have a single line.
- Line length in plies: minimum 1, one third are 7 or fewer, two thirds are 11 or fewer, maximum 36.
- There is no popularity data in the library, so depth cannot be based on how often a line is played.

## Approaches considered

1. **A learn engine that works on any repertoire tree (chosen).** A course is a repertoire tree built in memory from a family's lines using the existing `addOpeningToRepertoire`. The engine takes a tree and a side, and teaches one root-to-leaf line at a time. The same engine can later teach a user's own repertoire and power Practice.
2. **A separate course model.** More room to tune courses, but duplicates tree logic and would be redone for Practice. Rejected.
3. **Learn one library line at a time with no course.** Simple but does not give the course, depth, and progress feel the owner asked for. Rejected.

## Design

### Courses

- `courseId` is the slug of the family name (the text before the first colon). `coursesFrom(lines)` returns `{ id, name, lines }[]` for all families.
- A course tree is built with `addOpeningToRepertoire` into a fresh repertoire (not saved). Each line keeps its `openingKey` (from the descriptions work) as its stable id, used to record progress.
- The learner's side is chosen per session. Some lines branch on the learner's own move (gambits). The engine teaches one concrete line, so the learner is only asked for that line's moves for their side.

### Depth

Depth filters which lines a session offers, by the line's length in plies (my call, easy to change):

| Level      | Lines included           |
| ---------- | ------------------------ |
| Essentials | 7 plies or fewer         |
| Advanced   | 11 plies or fewer        |
| Full       | every line of the course |

A course whose levels would be identical (for example one line) shows only one choice. The depth can be changed at any time without losing progress.

### Learn engine (`src/domain/learn/`, pure and tested)

- `startLine(course, lineKey, side): LessonState` holds the line's moves, a cursor, and the learner's side. If the opponent moves first (learner is Black), the opponent's first move is played at start.
- `submitMove(state, san): { state, outcome }` where `outcome` is `correct` (state advances, the opponent's reply is applied, `finished` when the line ends), `wrong` (state unchanged, returns the recommended SAN), or `invalid` (not a legal move; state unchanged).
- `undo(state)` returns to the learner's previous turn. `hint(state)` returns the from-square of the recommended move. `solve(state)` plays the recommended move.
- `prompt(san, fen)` builds the instruction text, such as "Play knight to f3." Castling, captures, promotion, and checks have wording.
- `nextLine(course, depth, learned, side)` picks the first line within the depth that is not yet learned, or `null` when the course is done at that depth.
- Every function returns a new state and never mutates its input.

### Progress storage

- A new interface `ProgressStore` in `src/storage/` (kept apart from `RepertoireStore`): `markLearned(courseId, lineKey)`, `learnedLines(courseId): Promise<Set<string>>`, `learnedCounts(): Promise<Map<string, number>>`, `reset(courseId)`.
- A Dexie implementation adds one table (`learned`, key `[courseId+lineKey]`) as a new schema version. Existing data is untouched. Export and import of JSON includes progress.
- Wrong moves and hints are not stored. A line is learned when the learner finishes it without pressing Solve for any move (my call: Hint alone still counts).

### UI

- `#/learn`: course catalog with search, one card per course showing name, ECO range, line count, and "N learned". The existing opening pages stay as reference and gain a **Learn this opening** link.
- `#/learn/<courseId>`: course page with the description if one exists, depth choice, side choice, learned count, and a **Start** or **Continue** button.
- `#/learn/<courseId>/play?depth=&side=`: the session. Left: board (existing `Board` component with legal-move checks). Right: the prompt, the opponent's last reply, the progress bar (moves done in this line), and buttons Hint, Solve, Undo move, Try again. On a wrong move the message names the recommended move. A finished line shows "Line learned" with **Next line** and **Back to course**.
- The home page links to the catalog; the catalog is the main entry point.
- Accessibility: all actions are buttons, status text is announced in a live region, and the board move can also be played by keyboard-accessible controls in a later phase (known gap, listed under risks).

### Content

Written opening descriptions (the earlier plan `2026-11-03-opening-descriptions.md`, Tasks 8 and 9) continue as a separate track and appear on the course page when present. Learn mode does not wait for them.

## Decisions

- The owner decided: learning is the main purpose; every opening and every variation must be learnable; creating repertoires is secondary; behaviour must match ChessReps' Learn flow.
- My calls, to check: course = family by the text before the first colon; three depth levels by ply count (7 and 11); a line counts as learned unless Solve was used; progress in a separate `ProgressStore`; no explanations, eval bar, or gamification this phase.

## Risks and gaps

- Keyboard-only play on the board is not supported (same as the repertoire board).
- Families such as "Sicilian Defense" have 400 lines; the Full level is long, and ordering lines usefully (shortest first within the depth) is my call.
- Drag-and-drop was never verified by hand; the first browser check must use a real mouse.

## Left to the builder

- Exact wording of prompts and messages beyond the examples.
- Layout of the catalog and the session screen (follow `ui-ux-pro-max` guidance in the repo).
- Whether the catalog groups courses by ECO letter.
