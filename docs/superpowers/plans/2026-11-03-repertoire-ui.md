# Repertoire UI (Phase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a guest user create, open, edit, export, and import repertoires in the browser: start from an opening, play moves on a board, add comments, and delete moves.

**Architecture:** Domain helpers in `src/domain/` (pure, immutable, tested first). A Zustand store in `src/ui/store/` wraps the domain functions and persists through `RepertoireStore`. React pages in `src/ui/` render the store. Hash routing (`createHashRouter`) so the app works on GitHub Pages. The opening library is loaded with a dynamic import only when the picker opens.

**Tech Stack:** React 19, TypeScript, Vite, Vitest (node environment), chess.js, chessground, Dexie (fake-indexeddb in tests), Zustand, React Router (hash router), oxlint, Prettier.

**Spec:** `docs/superpowers/specs/2026-11-03-repertoire-ui-design.md`

## Global Constraints

- Domain code (`src/domain/**`) must not import React or the DOM.
- Domain functions are immutable: return a new repertoire, never mutate the input.
- App code talks to storage only through the `RepertoireStore` interface.
- Guest mode makes no network calls at runtime. The opening library ships in the bundle.
- No analytics or trackers.
- Routing is hash-based (`createHashRouter`), no Tailwind, no shadcn. Styling is plain CSS with custom properties in `src/index.css`.
- Board pointer targets at least 24×24 CSS px; move-list rows about 44 px tall on phones.
- UI text is English.
- Tests live in `src/**/*.test.ts` (or `.test.tsx`) next to the code.
- Commit subject under 72 characters, imperative, English. End each message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Each commit leaves `npx vitest run` and `npm run build` passing, except the red step of TDD, whose message says `Add failing test for ...`.

## Review Focus

1. Illegal move dropped on the board or typed as SAN → rejected, tree and saved data unchanged. Pinned in Tasks 4 and 7.
2. Blank or whitespace-only repertoire name → saved as `Untitled repertoire`. Pinned in Task 1.
3. Deleting the root position → refused, nothing changes. Pinned in Task 7.
4. Invalid PGN on import or from an opening line → error shown, no repertoire created. Pinned in Tasks 2 and 7.
5. Storage write fails → the in-memory tree is kept and a save error is shown. Pinned in Task 7.

---

### Task 1: Rename and recolor a repertoire

**Files:**

- Create: `src/domain/repertoire/edit.ts`
- Test: `src/domain/repertoire/edit.test.ts`

**Interfaces:**

- Consumes: `Repertoire`, `Color` from `src/domain/repertoire/tree.ts`
- Produces:
  - `renameRepertoire(rep: Repertoire, name: string): Repertoire` (trims; blank becomes `'Untitled repertoire'`)
  - `setRepertoireColor(rep: Repertoire, color: Color): Repertoire`

- [ ] **Step 1: Write the failing test**

`edit.test.ts` covers: `renameRepertoire(rep, '  Sicilian  ').name === 'Sicilian'`; `renameRepertoire(rep, '   ').name === 'Untitled repertoire'`; the input `rep.name` is unchanged after the call; `setRepertoireColor(rep, 'black').color === 'black'` and `.nodes` is the same object reference as `rep.nodes`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/repertoire/edit.test.ts`
Expected: FAIL, module `./edit` not found.

- [ ] **Step 3: Implement `renameRepertoire` and `setRepertoireColor` in `src/domain/repertoire/edit.ts`**

Return `{ ...rep, name }` and `{ ...rep, color }`. Trim the name and apply the fallback in `renameRepertoire` only.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/repertoire/edit.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/repertoire/edit.test.ts
git commit -m "Add failing test for rename and recolor repertoire" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git add src/domain/repertoire/edit.ts
git commit -m "Implement rename and recolor for repertoire" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Create a repertoire from an opening line

**Files:**

- Create: `src/domain/openings/fromOpening.ts`
- Test: `src/domain/openings/fromOpening.test.ts`

**Interfaces:**

- Consumes: `createRepertoire`, `IdFactory`, `Color` (tree.ts); `addOpeningToRepertoire` (`addToRepertoire.ts`); `OpeningLine` (`types.ts`)
- Produces: `repertoireFromOpening(line: OpeningLine, color: Color, newId: IdFactory): Repertoire`. The name is `line.name`. The moves are imported with `addOpeningToRepertoire`. Invalid movetext throws (propagated from `importPgn`).

- [ ] **Step 1: Write the failing test**

Use `line = { eco: 'A00', name: 'Amar Opening', pgn: '1. Nh3 d5' }` and a deterministic id factory (counter starting at 1, producing `'id1'`, `'id2'`, ...). Assert: `repertoireFromOpening(line, 'white', ids).name === 'Amar Opening'`; the root node's `childIds` has length 1 and that child's `san === 'Nh3'`; `repertoireFromOpening({ ...line, pgn: '1. Zz9' }, 'white', ids)` throws.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/openings/fromOpening.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `repertoireFromOpening` in `src/domain/openings/fromOpening.ts`**

Call `createRepertoire(line.name, color, newId)`, then pass the result and `line` to `addOpeningToRepertoire(rep, line, newId).repertoire`. Return that repertoire.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/openings/fromOpening.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

Use the same two-commit pattern as Task 1, with the subjects "Add failing test for repertoire from opening" and "Implement repertoire from opening".

---

### Task 3: Outline rows for the move list

**Files:**

- Create: `src/domain/repertoire/outline.ts`
- Test: `src/domain/repertoire/outline.test.ts`

**Interfaces:**

- Consumes: `Repertoire`, `getNode`, `getChildren` (tree.ts)
- Produces:
  - `interface OutlineRow { nodeId: string; depth: number; label: string }`
  - `outlineRows(rep: Repertoire): OutlineRow[]`

Rules: depth-first, main line (first child) before variations. The root is excluded. `depth` is 0 for nodes on the main line and goes up by 1 for each variation branch taken. `label` is `"<n>. <san>"` for White moves and `"<n>... <san>"` for Black moves, where `<n>` is the fullmove number from the node's FEN.

- [ ] **Step 1: Write the failing test**

Build a repertoire with `addMove` from the start position: `e4`, then `e5` under it, and a variation `c5` also under `e4`'s parent… use: root → `e4` (main) → `e5` (main child of e4), and `d5`-branch: root → `e4` → `c5` as a second child of `e4`. Assert the outline is `[{nodeId: e4, depth: 0, label: '1. e4'}, {nodeId: e5, depth: 0, label: '1... e5'}, {nodeId: c5, depth: 1, label: '1... c5'}]`. Use real `nodeId`s from the built tree.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/repertoire/outline.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `outlineRows` in `src/domain/repertoire/outline.ts`**

Iterative depth-first walk from `rep.rootId`, skipping the root itself. The fullmove number is `Number(node.fen.split(' ')[5])`. The mover is the side opposite to the side to move in the node's own FEN: if that FEN's side to move is `b`, White made the move, so the label is `"<n>. <san>"`; if it is `w`, Black made it, so the label is `"<n>... <san>"`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/repertoire/outline.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

Two commits, subjects "Add failing test for repertoire outline rows" and "Implement repertoire outline rows".

---

### Task 4: Convert a square move to SAN

**Files:**

- Create: `src/domain/repertoire/squares.ts`
- Test: `src/domain/repertoire/squares.test.ts`

**Interfaces:**

- Consumes: `Chess` from `chess.js`
- Produces: `sanFromSquares(fen: string, from: string, to: string): string | null`. Returns the SAN of the legal move, or `null` if the move is illegal. Promotion is always to a queen (my call: the UI does not offer a promotion choice in this phase).

- [ ] **Step 1: Write the failing test**

From the start FEN (`DEFAULT_POSITION`): `sanFromSquares(DEFAULT_POSITION, 'e2', 'e4') === 'e4'`; `sanFromSquares(DEFAULT_POSITION, 'e2', 'e5') === null`; `sanFromSquares(DEFAULT_POSITION, 'e7', 'e5') === null` (wrong side to move).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/repertoire/squares.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `sanFromSquares` in `src/domain/repertoire/squares.ts`**

Create `new Chess(fen)`, call `move({ from, to, promotion: 'q' })` inside try/catch, return `move.san`, or `null` on error.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/repertoire/squares.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

Two commits, subjects "Add failing test for square to SAN conversion" and "Implement square to SAN conversion".

---

### Task 5: File name for PGN export

**Files:**

- Create: `src/domain/pgn/filename.ts`
- Test: `src/domain/pgn/filename.test.ts`

**Interfaces:**

- Produces: `pgnFileName(name: string): string`. Lowercases, replaces each run of characters other than `a-z0-9` with `-`, trims leading and trailing `-`, appends `.pgn`. A name that becomes empty gives `repertoire.pgn`.

- [ ] **Step 1: Write the failing test**

`pgnFileName('My Sicilian: Najdorf!') === 'my-sicilian-najdorf.pgn'`; `pgnFileName('   ') === 'repertoire.pgn'`; `pgnFileName('Ruy Lopez') === 'ruy-lopez.pgn'`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/pgn/filename.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `pgnFileName` in `src/domain/pgn/filename.ts`**

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/pgn/filename.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

Two commits, subjects "Add failing test for PGN file name" and "Implement PGN file name".

---

### Task 6: Route paths

**Files:**

- Create: `src/ui/paths.ts`
- Test: `src/ui/paths.test.ts`

**Interfaces:**

- Produces:
  - `homePath: '/'`
  - `repertoirePath(id: string): string` returns `/r/<encodeURIComponent(id)>`

- [ ] **Step 1: Write the failing test**

`repertoirePath('abc') === '/r/abc'`; `repertoirePath('a b/c') === '/r/a%20b%2Fc'`; `homePath === '/'`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ui/paths.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `src/ui/paths.ts`**

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/ui/paths.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

Two commits, subjects "Add failing test for route paths" and "Implement route paths".

---

### Task 7: App store

**Files:**

- Create: `src/ui/store/appStore.ts`
- Test: `src/ui/store/appStore.test.ts`

**Interfaces:**

- Consumes: all domain functions from Tasks 1–5 and `addMove`, `deleteNode`, `setComment`, `createRepertoire`, `importPgn` (tree.ts, pgn.ts); `RepertoireStore`, `RepertoireSummary` (`src/storage/store.ts`); `IdFactory`.
- Produces: `createAppStore(deps: { store: RepertoireStore; newId: IdFactory }): StoreApi<AppState>` (Zustand vanilla `createStore`, so tests need no React).

`AppState` fields:

- `summaries: RepertoireSummary[]`
- `current: Repertoire | null`
- `selectedNodeId: string | null`
- `error: string | null` (last user-facing message; cleared on the next successful action)
- `saveError: boolean` (true after a failed write; cleared on the next successful write)

Actions:

- `loadList(): Promise<void>`
- `open(id: string): Promise<void>`: loads the repertoire, sets `selectedNodeId` to `rootId`. Unknown id sets `error`.
- `create(name: string, color: Color): Promise<string>` returns the new id.
- `fromOpening(line: OpeningLine, color: Color): Promise<string>` uses Task 2. Invalid line sets `error` and returns `''`, creating nothing.
- `importPgn(text: string, name: string, color: Color): Promise<string>`: `createRepertoire` then `importPgn`. Invalid text sets `error` and returns `''`, creating nothing.
- `rename(name: string)`, `setColor(color: Color)`: act on `current`.
- `remove(id: string): Promise<void>`
- `playMove(san: string): Promise<void>`: `addMove` on `selectedNodeId`. Illegal move sets `error` and changes nothing.
- `selectNode(nodeId: string): void`
- `deleteSelected(): Promise<void>`: refuses the root, sets `error`.
- `setComment(text: string): Promise<void>`: applies to the selected node.

Every write goes through `store.save` (or `store.remove`). A rejected write sets `saveError: true` and keeps `current` as it is in memory.

- [ ] **Step 1: Write the failing tests**

Create an in-memory `RepertoireStore` inside the test file with a `Map`. Cover at least:

- `create` then `loadList` shows the new summary; `create` with `'  '` as name stores `Untitled repertoire`.
- `playMove('e4')` from the root updates `current`, sets `selectedNodeId` to the new node, and calls `save` once.
- `playMove('Ke5')` from the start (illegal) leaves `current` and `selectedNodeId` unchanged and sets `error`. Also `save` is not called.
- `deleteSelected()` on the root sets `error` and keeps the tree (Review Focus 3).
- `deleteSelected()` after `playMove('e4')` removes that node and selects the root.
- `setComment('Main line')` on the selected node stores the comment and saves.
- `importPgn('garbage (((', 'x', 'white')` returns `''`, sets `error`, and `loadList` shows no new repertoire (Review Focus 4).
- `fromOpening` with a valid line creates a repertoire with the line's name.
- A store whose `save` rejects: `playMove('e4')` keeps `current` with the new move and sets `saveError: true` (Review Focus 5).
- `remove(id)` removes the summary.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ui/store/appStore.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `createAppStore` in `src/ui/store/appStore.ts`**

Use `createStore` from `zustand/vanilla`. Keep each action short: call the domain function, then the store, then set state. Put the `try/catch` around domain calls only, so a failed save is not reported as an illegal move.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/ui/store/appStore.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

Two commits, subjects "Add failing tests for app store" and "Implement app store over repertoire store".

---

### Task 8: Router and app shell

**Files:**

- Modify: `src/App.tsx` (replace the placeholder)
- Modify: `src/main.tsx` (create the store and router)
- Create: `src/ui/router.tsx`
- Create: `src/ui/pages/NotFoundPage.tsx`

**Interfaces:**

- Consumes: `createAppStore` (Task 7), `homePath`, `repertoirePath` (Task 6), `VariantoDb` and `DexieRepertoireStore` (`src/storage/db.ts`, `src/storage/dexieStore.ts`)
- Produces: `createAppRouter(store: StoreApi<AppState>): Router`, from React Router `createHashRouter`. Routes: `homePath` renders the home page (Task 9) and `repertoirePath(':id')` renders the board page (Task 10). Anything else renders `NotFoundPage`.

- [ ] **Step 1: Verify the baseline**

Run: `npm run build`
Expected: exit code 0.

- [ ] **Step 2: Implement the router, the shell, and `main.tsx`**

`main.tsx` builds `new DexieRepertoireStore(new VariantoDb())`, `createAppStore({ store, newId: () => crypto.randomUUID() })`, and renders `<App store={...} />`. `App` renders `<RouterProvider router={createAppRouter(store)} />`. Routes can be stubs (a page that returns a heading) until Tasks 9 and 10 fill them in.

- [ ] **Step 3: Run build and lint**

Run: `npm run build && npm run lint`
Expected: both exit code 0.

- [ ] **Step 4: Commit**

Commit subject: "Add hash router and app shell". Use the `Co-Authored-By` footer from Global Constraints.

---

### Task 9: Home page, opening picker, and PGN import

**Files:**

- Create: `src/ui/pages/HomePage.tsx`
- Create: `src/ui/OpeningPicker.tsx`
- Create: `src/ui/ImportPgn.tsx`
- Modify: `src/index.css` (form and list styles, focus rings, 24 px minimum targets, skip link)

**Interfaces:**

- Consumes: `createAppStore` actions (Task 7), `findOpenings` (`src/domain/openings/search.ts`), `OpeningLine` (`types.ts`), `repertoirePath` (Task 6)
- Produces: `HomePage` (no props, reads the store). `OpeningPicker` loads the library with `await import('../data/openings.json')` on first open, so the JSON is a separate chunk.

Behavior:

- Home lists repertoires as links to `repertoirePath(id)`. Shows "New repertoire" with a name field and side choice (White or Black).
- "Start from an opening" opens the picker: a search field (`findOpenings`), results as buttons, and a side choice. Picking a line calls `fromOpening` and navigates to the board.
- "Import PGN" accepts pasted text (`textarea`) and a file input (`File.text()`). It needs a name and side, then calls `importPgn`.
- Errors from the store show in a `role="alert"` region.
- A skip link at the top of the page targets `#main`.

- [ ] **Step 1: Run build and record chunk layout (baseline before the picker)**

Run: `npm run build` and `ls dist/assets`.
Expected: exit code 0. Note the single main JS file.

- [ ] **Step 2: Implement the three components**

Keep the picker's search in component state. Show the first 50 results only, so the list stays short on phones.

- [ ] **Step 3: Verify the lazy chunk**

Run: `npm run build && ls dist/assets`
Expected: exit code 0, and a separate `openings-*.js` chunk exists that the main bundle does not contain. Check with `grep -l "Amar Opening" dist/assets/*.js`: only the separate chunk should match.

- [ ] **Step 4: Manual check in the browser**

Run: `npm run dev`. Create a White repertoire, start from an opening, import a short PGN, and confirm each appears on Home. Check a 375 px wide viewport for horizontal scroll.

- [ ] **Step 5: Commit**

Two commits: "Add home page with new repertoire, opening picker, and PGN import", and, if the CSS is separated, "Style home page for phone width and focus rings". Use the `Co-Authored-By` footer from Global Constraints.

---

### Task 10: Board page, move list, comment, and delete

**Files:**

- Create: `src/ui/pages/BoardPage.tsx`
- Create: `src/ui/Board.tsx` (chessground wrapper)
- Create: `src/ui/MoveList.tsx`
- Modify: `src/index.css` (board and list layout, selected-move accent)

**Interfaces:**

- Consumes: store (`current`, `selectedNodeId`, `open`, `playMove`, `selectNode`, `deleteSelected`, `setComment`, `error`, `saveError`), `outlineRows` (Task 3), `sanFromSquares` (Task 4), `getNode` (tree.ts), `chessground`.
- Produces:
  - `Board` props: `{ fen: string; orientation: 'white' | 'black'; canMove: boolean; onMove: (from: string, to: string) => void }`
  - `MoveList` props: `{ rows: OutlineRow[]; selectedId: string | null; onSelect: (nodeId: string) => void }`

Behavior:

- Board mounts chessground once in a `useRef`/`useEffect`, and calls `set` when `fen` changes. `movable` allows the user's color only, when it is their turn. `onMove` uses `sanFromSquares` and then `playMove(san)`. Illegal results are reflected by re-setting the board to the store's `fen` (the board snaps back).
- Move list is a list of buttons. Up and Down arrow keys move the selection. Enter selects. The selected row has `aria-current="true"`.
- "Delete move" is disabled when the root is selected. "Comment" is a textarea that calls `setComment` on blur.
- The board page calls `open(id)` on mount. A missing repertoire shows a message with a link home.
- Errors show in `role="alert"`. `saveError` shows "Changes are not saved. Check browser storage." and stays until the next successful save.

- [ ] **Step 1: Run build**

Run: `npm run build`. Expected: exit code 0.

- [ ] **Step 2: Implement the components and page**

Check the chessground API in `node_modules/chessground` (`Chessground` default export, `set`, `config.movable`, `config.events.after`) before writing the wrapper. Import the base and theme CSS from the package's `assets/` folder in `src/index.css`.

- [ ] **Step 3: Manual check in the browser**

Run: `npm run dev`. Play `e4`, then `e5`. Confirm the list shows `1. e4` and `1... e5`. Play a different second move from `e4` to create a variation, and confirm it appears indented. Delete a move, confirm the root cannot be deleted, edit a comment and reload to confirm it persists. Try an illegal drop: the board should snap back and no row should be added. Use the keyboard only: Tab to the list, Up and Down to move, Enter to select.

- [ ] **Step 4: Commit**

Commit subject: "Add board page with move list, comments, and delete". If the work splits, use "Add move list component" and "Add board page" as separate commits. Use the `Co-Authored-By` footer from Global Constraints.

---

### Task 11: Export PGN

**Files:**

- Create: `src/ui/ExportButton.tsx`
- Modify: `src/ui/pages/BoardPage.tsx` (render the button)

**Interfaces:**

- Consumes: `exportPgn` (`src/domain/pgn/pgn.ts`), `pgnFileName` (Task 5), `current` from the store.
- Produces: `ExportButton` (props: `{ rep: Repertoire }`). Builds a `Blob` with type `application/x-chess-pgn`, creates an object URL, clicks a temporary anchor with the file name, and revokes the URL.

- [ ] **Step 1: Implement**

No new unit test: the logic is in `exportPgn` (tested) and `pgnFileName` (Task 5).

- [ ] **Step 2: Manual check**

Run: `npm run dev`. Export a repertoire with a variation and a comment. Open the downloaded file and confirm it matches the tree and has the expected file name.

- [ ] **Step 3: Commit**

Commit subject: "Add PGN export button to board page".

---

### Task 12: Final verification and acceptance flow

**Files:** none changed unless a check fails.

- [ ] **Step 1: Run the test suite**

Run: `npx vitest run`
Expected: all test files pass; the output ends with `Test Files … passed` and no failures.

- [ ] **Step 2: Run the build**

Run: `npm run build`
Expected: exit code 0.

- [ ] **Step 3: Run lint and format check**

Run: `npm run lint && npm run format:check`
Expected: both exit code 0 with no errors.

- [ ] **Step 4: Acceptance flow in the browser (fresh profile)**

Run: `npm run dev`. Following the spec's Phase 2 flow in a clean browser profile: create a repertoire from an opening; add a branch; add a comment; delete a move; export PGN; then import that PGN as a new repertoire and confirm the tree matches. Reload between steps to confirm persistence. Check dark mode with `prefers-color-scheme: dark`, and a 375 px viewport.

- [ ] **Step 5: Record results**

Report each command's output and the acceptance flow result in the completion message. Do not claim success for any step that was not run.
