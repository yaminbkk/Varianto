# Search Courses by Moves Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On the learn catalog, let the learner type a move sequence (for example `1.e4 e5 2.Nf3`) and see the courses whose lines start with those moves.

**Architecture:** A pure domain function in `src/domain/learn/searchCourses.ts` matches move prefixes against each course's lines, reusing `sanSequence` from `src/domain/openings/parse.ts`. The catalog page gets a "Search by moves" toggle that picks between the existing name search and this one. Variation courses are not matched by moves in this version (YAGNI).

**Tech Stack:** TypeScript, Vitest, React.

**Spec:** This plan (scope decided with the user on 2026-11-03: move-prefix search, toggle in the catalog).

## Global Constraints

- Domain code (`src/domain/`) must not import React or the DOM.
- Domain functions are pure and never mutate their inputs.
- Move numbers (`1.`, `1...`) are ignored; `e4 e5` and `1.e4 e5` mean the same.
- Commits: one failing-test commit, then its implementation commit. Each commit leaves `npx vitest run` and `npm run build` passing, except the failing-test commit.
- Do not stage `src/storage/dexieStore.ts` or `src/ui/store/appStore.test.ts` (unrelated uncommitted edits).

## Review Focus

- Empty or whitespace-only query returns every family unchanged.
- A query longer than any line returns no match, and does not throw.
- A query whose first move is by the wrong colour (for example `e5` first) returns no match.
- Move numbers in any form (`1.`, `1...`) are ignored.

---

### Task 1: Match courses by move prefix

**Files:**
- Modify: `src/domain/learn/searchCourses.ts`
- Test: `src/domain/learn/searchCourses.test.ts`

**Interfaces:**
- Consumes: `Course`, `CourseLine` from `./courses`; `sanSequence` from `../openings/parse`.
- Produces: `searchCoursesByMoves(families: readonly Course[], moves: string): Course[]`

- [ ] **Step 1: Write the failing tests** (append to `searchCourses.test.ts`, using the existing `families` and `names` helpers)

```ts
describe('searchCoursesByMoves', () => {
  const byMoves = (moves: string) => searchCoursesByMoves(families, moves).map((c) => c.name)

  it('returns every family for an empty query', () => {
    expect(searchCoursesByMoves(families, '  ')).toEqual(families)
  })

  it('finds a course whose line starts with the moves, numbered or not', () => {
    expect(byMoves('1.e4 e5 2.Nf3')).toContain('The Italian Game')
    expect(byMoves('e4 e5 Nf3')).toContain('The Italian Game')
  })

  it('does not match moves that appear only later in a line', () => {
    expect(byMoves('1.Bc4')).not.toContain('The Italian Game')
  })

  it('returns nothing when the first move is by the wrong colour', () => {
    expect(byMoves('e5')).toEqual([])
  })

  it('returns nothing for a sequence longer than every line', () => {
    expect(byMoves('e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 d5 e5 e4 zz')).toEqual([])
  })
})
```

Also update the import line to `import { searchCourses, searchCoursesByMoves } from './searchCourses'`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/domain/learn/searchCourses.test.ts`
Expected: FAIL, `searchCoursesByMoves` is not exported.

- [ ] **Step 3: Commit the failing test**

```bash
git add src/domain/learn/searchCourses.test.ts
git commit -m "Add failing test for searching courses by moves"
```
(Message body: "Failing step of TDD." — keep subject under 72 chars and end with Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>.)

- [ ] **Step 4: Implement `searchCoursesByMoves` in `searchCourses.ts`**

Tokenize with `sanSequence(moves).split(' ').filter(Boolean)` and lowercase nothing (SAN is case-sensitive: `Nf3`). Return `[...families]` when there are no tokens. For each family, include it when some `CourseLine` has `sanSequence(line.line.pgn).split(' ')` whose first `tokens.length` entries equal the tokens (and whose length is at least `tokens.length`). Return a new array.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/domain/learn/searchCourses.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/domain/learn/searchCourses.ts
git commit -m "Search courses by move prefix"
```

---

### Task 2: Move-search toggle on the learn catalog

**Files:**
- Modify: `src/ui/pages/LearnCatalogPage.tsx` (state near line 30, `shown` memo near line 53, search field near line 92)

**Interfaces:**
- Consumes: `searchCoursesByMoves` from `../../domain/learn/searchCourses`.
- Produces: nothing for later tasks.

- [ ] **Step 1: Add state and toggle.** Add `const [byMoves, setByMoves] = useState(false)`. Add a checkbox `<input type="checkbox">` labelled "Search by moves" next to the search field. The `shown` memo uses `byMoves ? searchCoursesByMoves(courses, query) : searchCourses(courses, query)` and adds `byMoves` to its dependencies. Update the label text to "Search by moves (for example 1.e4 e5)" when the toggle is on.

- [ ] **Step 2: Verify.** Run `npx vitest run`, `npm run build`, `npm run lint`. All must pass. Then start the dev server (`npm run dev`), check in the browser that the toggle filters the list, and check at 375px width that there is no horizontal scroll.

- [ ] **Step 3: Commit**

```bash
git add src/ui/pages/LearnCatalogPage.tsx
git commit -m "Add a search-by-moves toggle to the learn catalog"
```
