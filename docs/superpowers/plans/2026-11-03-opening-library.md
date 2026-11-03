# Opening Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a bundled, offline list of ~3,865 named opening lines (CC0 data from `lichess-org/chess-openings`), validated at build time, with a pure function to copy a chosen line into a repertoire.

**Architecture:** Pure parsing and validation live in `src/domain/openings/` (no React, no DOM). A Node build script reads vendored TSV files, calls the same parser, and writes `src/data/openings.json`, which the app imports statically. Adding a line to a repertoire reuses the existing `importPgn`.

**Tech Stack:** TypeScript strict, `chess.js` 1.4.x (legality), `@mliebelt/pgn-parser` via existing `importPgn`, Vitest 5, Node 22.23.4 (runs `.ts` scripts through built-in type stripping).

**Spec:** `docs/superpowers/specs/2026-11-03-opening-library-design.md`

## Global Constraints

- Source commit: `712a58be746c143f4ab935b68acc50f4bac813eb` of `lichess-org/chess-openings`, license CC0-1.0.
- Source files are exactly `a.tsv`, `b.tsv`, `c.tsv`, `d.tsv`, `e.tsv`, each with a header row `eco\tname\tpgn`.
- Total data rows across the five files: 3,865.
- Output JSON path: `src/data/openings.json`.
- No new runtime dependencies. No network access at runtime.
- `src/domain/` imports no React and no DOM.
- Domain functions return new values and never mutate their inputs.
- Commit messages: short, imperative, English, subject under 72 characters, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. CRLF line endings or trailing whitespace in the TSV → rows must still parse; trimmed `name` and `pgn`.
2. A row whose PGN has a trailing result token (`1-0`, `0-1`, `1/2-1/2`, `*`) → must not be rejected as illegal; the result token is stripped before validation.
3. An empty `pgn` cell or an empty `name` cell → build fails with the row number.
4. The same `(eco, name)` pair appearing in two files or twice in one file → build fails, naming both rows.
5. Non-ASCII opening names (e.g. accented letters) → preserved byte-for-byte in the JSON and matched by `findOpenings`.

Each line is pinned by a test in the task that owns it (Tasks 2 and 3).

---

### Task 1: Vendor the source data and attribution

**Files:**
- Create: `data/openings/a.tsv`, `data/openings/b.tsv`, `data/openings/c.tsv`, `data/openings/d.tsv`, `data/openings/e.tsv` (copied verbatim from the pinned commit)
- Create: `data/openings/COPYING.txt` (copied verbatim from the pinned commit)
- Create: `data/openings/SOURCE.md`
- Modify: `README.md` (one "Credits" section pointing to `data/openings/SOURCE.md`)

**Interfaces:**
- Consumes: nothing.
- Produces: the five TSV paths above, used by Task 3.

- [ ] **Step 1: Fetch the five TSV files and COPYING.txt at the pinned commit**

Run:
```bash
for f in a b c d e; do gh api "repos/lichess-org/chess-openings/contents/$f.tsv?ref=712a58be746c143f4ab935b68acc50f4bac813eb" -H "Accept: application/vnd.github.raw" > "data/openings/$f.tsv"; done
gh api "repos/lichess-org/chess-openings/contents/COPYING.txt?ref=712a58be746c143f4ab935b68acc50f4bac813eb" -H "Accept: application/vnd.github.raw" > data/openings/COPYING.txt
```
Expected: five TSV files plus `COPYING.txt` exist. Step 4 is the authoritative row count.

- [ ] **Step 2: Write `data/openings/SOURCE.md`**

State: source repo URL, pinned commit SHA, license CC0-1.0, the date fetched (2026-11-03), and the note that the files are unmodified copies.

- [ ] **Step 3: Add a Credits section to `README.md`**

One paragraph linking to `data/openings/SOURCE.md` and naming `lichess-org/chess-openings` (CC0-1.0).

- [ ] **Step 4: Verify the data**

Run: `for f in data/openings/*.tsv; do tail -n +2 "$f" | wc -l; done | awk '{s+=$1} END {print s}'`
Expected: `3865`

- [ ] **Step 5: Commit**

```bash
git add data/openings README.md
git commit -m "Vendor CC0 opening lines with source notice

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Parse and validate TSV rows (TDD)

**Files:**
- Create: `src/domain/openings/types.ts`
- Create: `src/domain/openings/parse.ts`
- Test: `src/domain/openings/parse.test.ts`

**Interfaces:**
- Consumes: `chess.js` (`Chess`, `DEFAULT_POSITION`).
- Produces:
  ```ts
  // types.ts
  export interface OpeningLine { eco: string; name: string; pgn: string }

  // parse.ts
  export function parseOpeningsTsv(text: string, sourceLabel: string): OpeningLine[]
  // Throws Error whose message starts with `${sourceLabel}:${lineNumber}:` on the first invalid row.
  // Throws `Duplicate opening ${eco} "${name}" at ${sourceLabel}:${lineNumber}` on duplicates within the text.
  ```
  `parseOpeningsTsv` does not handle cross-file duplicates; Task 3 does that.

- [ ] **Step 1: Write the failing tests**

In `parse.test.ts`, write these cases (names exact):
- `parses a header and one row into an OpeningLine`: input `"eco\tname\tpgn\nA00\tAmar Opening\t1. Nh3\n"` → `[{ eco: 'A00', name: 'Amar Opening', pgn: '1. Nh3' }]`.
- `accepts CRLF line endings and trims cells` (Review Focus 1): input with `\r\n` and trailing spaces in `name` → same shape, trimmed.
- `strips a trailing result token before validation` (Review Focus 2): pgn `1. e4 e5 1-0` → stored pgn is `1. e4 e5` (store the stripped form).
- `rejects an illegal move with the row number` : pgn `1. e5` → throws, message contains `test.tsv:2:`.
- `rejects an empty pgn cell` (Review Focus 3): throws, message contains `test.tsv:2:`.
- `rejects an empty name cell` (Review Focus 3): throws, message contains `test.tsv:2:`.
- `rejects a duplicate eco and name within one text` (Review Focus 4): two identical rows → throws, message contains `Duplicate opening A00 "Amar Opening"`.
- `preserves non-ASCII names` (Review Focus 5): name `Gambito del Rey Ñ` → unchanged.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/domain/openings/parse.test.ts`
Expected: FAIL, module `./parse` not found.

- [ ] **Step 3: Implement `types.ts` and `parse.ts`**

Approach: split on `\n`, strip a trailing `\r`, skip the header line, split each row on `\t` into exactly three cells. Validate with `new Chess().move(san)` for each SAN token after removing move numbers and any final result token (`1-0`, `0-1`, `1/2-1/2`, `*`). Track `eco\u0000name` keys in a `Set` for duplicates. Return a new array.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/domain/openings/parse.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit the failing test, then the implementation**

```bash
git add src/domain/openings/parse.test.ts
git commit -m "Add failing tests for opening TSV parsing

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git add src/domain/openings/types.ts src/domain/openings/parse.ts
git commit -m "Parse and validate opening lines from TSV

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Build script and generated JSON (TDD)

**Files:**
- Create: `scripts/build-openings.ts`
- Create: `src/data/openings.json` (generated, committed)
- Create: `src/domain/openings/build.ts`
- Test: `src/domain/openings/build.test.ts`
- Modify: `package.json` (add script `"openings": "node scripts/build-openings.ts"`)

**Interfaces:**
- Consumes: `parseOpeningsTsv` from Task 2.
- Produces:
  ```ts
  // build.ts
  export function buildOpeningLibrary(files: { label: string; text: string }[]): OpeningLine[]
  // Parses each file, rejects duplicate (eco, name) across all files with a message
  // naming both labels and line numbers, and returns lines sorted by eco then name.
  ```
  `scripts/build-openings.ts` reads `data/openings/{a..e}.tsv`, calls `buildOpeningLibrary`, writes `JSON.stringify(lines, null, 2) + '\n'` to `src/data/openings.json`.

- [ ] **Step 1: Write the failing tests in `build.test.ts`**
- `merges files and sorts by eco then name`: two inputs in reverse order → sorted output.
- `rejects a duplicate across files and names both locations` (Review Focus 4): same `(eco, name)` in `a.tsv` and `b.tsv` → throws, message contains both `a.tsv` and `b.tsv`.
- `committed openings.json matches a fresh build`: reads `data/openings/*.tsv` via `node:fs`, runs `buildOpeningLibrary`, compares with `JSON.parse(readFileSync('src/data/openings.json'))` using `toEqual`. Failure message tells the reader to run `npm run openings`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/domain/openings/build.test.ts`
Expected: FAIL, module `./build` not found.

- [ ] **Step 3: Implement `build.ts` and `scripts/build-openings.ts`**

Use `node:fs` and `node:path` only. The script exits non-zero and prints the error if the build throws.

- [ ] **Step 4: Generate the JSON and run the tests**

Run: `npm run openings && npx vitest run src/domain/openings/build.test.ts`
Expected: the script prints `3865 openings written`; tests PASS.

- [ ] **Step 5: Verify the output size**

Run: `wc -c src/data/openings.json`
Expected: under 500000 bytes. If it is larger, stop and report it; the spec says to load lazily in that case.

- [ ] **Step 6: Commit in three steps**

```bash
git add src/domain/openings/build.test.ts
git commit -m "Add failing tests for opening library build

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git add src/domain/openings/build.ts scripts/build-openings.ts package.json
git commit -m "Add opening library build script

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git add src/data/openings.json
git commit -m "Generate bundled opening library JSON

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Search openings (TDD)

**Files:**
- Create: `src/domain/openings/search.ts`
- Test: `src/domain/openings/search.test.ts`

**Interfaces:**
- Consumes: `OpeningLine` from `types.ts`.
- Produces:
  ```ts
  export function findOpenings(lines: readonly OpeningLine[], query: string): OpeningLine[]
  // Case-insensitive substring match on name or eco. Empty or whitespace-only query returns all lines.
  // Returns a new array; the input is not mutated.
  ```

- [ ] **Step 1: Write the failing tests**
- `matches name case-insensitively`: query `paris` finds `Amar Opening: Paris Gambit`.
- `matches the ECO code`: query `a00` finds lines with `eco === 'A00'`.
- `returns every line for an empty query`.
- `matches accented names without normalizing them` (Review Focus 5): query `ñ` finds `Gambito del Rey Ñ`.
- `does not mutate the input array`: `Object.freeze` the input array, call, no throw, length unchanged.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/domain/openings/search.test.ts`
Expected: FAIL, module `./search` not found.

- [ ] **Step 3: Implement `findOpenings`**

Lowercase both sides with `toLowerCase()` and use `includes`. Return `lines.filter(...)`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/domain/openings/search.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit the failing test, then the implementation**

```bash
git add src/domain/openings/search.test.ts
git commit -m "Add failing tests for opening search

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git add src/domain/openings/search.ts
git commit -m "Add case-insensitive opening search

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Copy a line into a repertoire (TDD)

**Files:**
- Create: `src/domain/openings/addToRepertoire.ts`
- Test: `src/domain/openings/addToRepertoire.test.ts`

**Interfaces:**
- Consumes: `OpeningLine` (Task 2), `Repertoire` and `IdFactory` from `src/domain/repertoire/tree.ts`, `importPgn` from `src/domain/pgn/pgn.ts`.
- Produces:
  ```ts
  export function addOpeningToRepertoire(
    rep: Repertoire,
    line: OpeningLine,
    newId: IdFactory,
  ): { repertoire: Repertoire; games: number }
  // Delegates to importPgn(rep, line.pgn, newId). Returns the new repertoire; `rep` is not mutated.
  ```

- [ ] **Step 1: Write the failing tests**
- `copies the line's moves as nodes`: empty repertoire (`createRepertoire('Test', 'white')`), line `Amar Opening: Paris Gambit` → `getLine` of the last node has 5 SAN moves matching the PGN.
- `importing the same line twice does not duplicate branches`: result of second call has the same `Object.keys(nodes).length` as the first.
- `does not mutate the input repertoire`: deep-equal snapshot of `rep` before and after.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/domain/openings/addToRepertoire.test.ts`
Expected: FAIL, module `./addToRepertoire` not found.

- [ ] **Step 3: Implement `addOpeningToRepertoire`**

A one-line delegation to `importPgn`. Use the `OpeningLine` pgn as-is; the pgn has no headers, and if `importPgn` rejects headerless movetext, the test in Step 1 fails and the implementer must wrap the movetext in a minimal header block inside this function and note it in the commit message.

- [ ] **Step 4: Run tests to verify they pass, then the full suite**

Run: `npx vitest run`
Expected: all test files PASS (previous 69 plus the new openings tests).

- [ ] **Step 5: Commit the failing test, then the implementation**

```bash
git add src/domain/openings/addToRepertoire.test.ts
git commit -m "Add failing tests for copying an opening into a repertoire

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git add src/domain/openings/addToRepertoire.ts
git commit -m "Copy opening lines into a repertoire via importPgn

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Final verification

**Files:** none changed unless a check fails.

- [ ] **Step 1: Run all three project checks**

Run: `npx vitest run && npm run build && npm run lint`
Expected: tests all PASS; `tsc -b && vite build` completes without errors; oxlint reports no errors.

- [ ] **Step 2: Confirm the build does not touch the network**

Run: `grep -rn "fetch(\|http" src/domain/openings src/data || echo none`
Expected: `none`

## Self-Review

- Spec coverage: intent, goals, constraints, approaches (build-time generation), data type, validation, search, copy-to-repertoire, attribution, and the four listed test cases are each covered by Tasks 1–5. The "left for the builder" items are decided here: committed JSON with a freshness test, and a 500 KB size check in Task 3.
- Type consistency: `OpeningLine` is defined once in Task 2 and used unchanged in Tasks 3–5. `parseOpeningsTsv`, `buildOpeningLibrary`, `findOpenings`, and `addOpeningToRepertoire` names match between their Produces and Consumes blocks.
- Review Focus: each of the five lines has its test in the owning task (Task 2 for 1–3 and 5 via the name test, Task 3 for 4, Task 4 for 5's search path).
- Gap noted: Task 1 Step 1 counts depend on `wc -l` semantics; Step 4 is the authoritative check (3,865 data rows).

---

Plan complete and saved to `docs/superpowers/plans/2026-11-03-opening-library.md`. Please review the plan. Which execution approach would you prefer?

- **Subagent-driven**: a fresh subagent implements each task and a fresh reviewer checks it before the next one starts, then a whole-branch review at the end. Most thorough, but costs a fresh context per task and per review.
- **Native**: I implement every task myself in this session, then one fresh reviewer checks the whole branch. Cheapest and fastest, with no independent review until the end.

**I recommend Native.** The plan has six small tasks with thin interfaces, the data is factual and checked by tests, and a mistake would be cheap to fix before release. Does the plan capture what you want, and which approach should we use?

