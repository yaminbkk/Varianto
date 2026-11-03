# Repertoire UI (Phase 2) Design

Status: draft for review. Nothing here is built yet.

## Intent and why

A new user should be able to open Varianto and build a first repertoire line without an account and without reading documentation. Phase 1 gave us the domain model, guest storage, PGN, and the opening library. Phase 2 puts a UI on top of them so the user can create repertoires, play moves on a board, and see the resulting move tree.

Success means: a new user opens the app, picks an opening from the library, sees it on the board, and can add a branch of their own within a few minutes.

## Goals

- First-run entry point: start from an opening in the library (the decided path).
- Board page: play moves with chessground, add them to the repertoire through `addMove`, see the current line and the move tree, edit comments, and delete moves.
- Repertoire list page: create, rename, delete, and choose the side (White or Black).
- Import and export PGN (plan item 7), reusing `domain/pgn`.
- Data access only through `RepertoireStore`, so guest (Dexie) and a later login (Supabase) stay interchangeable.

## Non-goals

- Practice mode, SRS, and progress tracking (Phase 3).
- Engine analysis, Lichess statistics, and sync (V1 and later).
- Accounts and login.
- Full i18n. UI text stays in English for now, per CLAUDE.md.

## Anti-goals

- A marketing-style landing page. The first screen is the tool itself.
- Any network call at runtime. Everything runs from the static bundle.
- Loading the whole opening library (about 590 KB JSON) on app start.

## Constraints

- Domain code in `src/domain/` must not import React or the DOM. All domain functions stay immutable.
- Routing must work on GitHub Pages. Use hash routing so no server fallback is needed.
- The board library is `chessground` (GPL-3.0, already in `package.json`).
- Mobile width (375 px) must work: no horizontal page scroll, 16 px side gutter.
- Light and dark color schemes both supported, following `prefers-color-scheme`.
- Keyboard accessible: every action reachable without a pointer. Board moves may need a keyboard alternative (for example, typing SAN into an input).

## What the user sees (first version)

1. **Home (`#/`)**: list of repertoires with a "New repertoire" button. When the list is empty, the empty state offers two actions: "Start from an opening" (the decided path) and "Import PGN". Starting from an opening opens a search box over the opening library. Picking a line creates a repertoire for the chosen side and opens the board.
2. **Board (`#/r/:id`)**: chessground board on the left (stacked above the move list on phones). On the right: the move list for the current line, with variations shown as indented branches, and a comment box for the selected move. Actions: play a move on the board, select a move in the list, delete the selected move, edit its comment.
3. **Repertoire settings (within the list, or a dialog)**: rename, change side, delete (with confirmation).
4. **Import / export**: on Home, "Import PGN" accepts pasted text or a file. "Export PGN" downloads the selected repertoire as a `.pgn` file.

## Approaches

Three choices shape the build. For each, I list the options and my recommendation.

**1. Routing**
- A. Hash routing with React Router (`createHashRouter`). Works on GitHub Pages, standard API, already a dependency.
- B. No router; a single `useState` for the current screen. Smaller, but no deep links and no back button.
- **Recommendation: A.** Deep links to a repertoire matter for the "share a repertoire" future item, and the back button should work on phones.

**2. App state**
- A. Zustand store holding the current repertoire and the selected node id, with async load and save through `RepertoireStore`.
- B. Each page loads its own data with `useEffect` and calls `RepertoireStore` directly.
- **Recommendation: A.** `architecture.md` already chose Zustand. The board needs a shared "current repertoire" state across the board, the move list, and the comment box. A single store avoids passing props through several levels.

**3. Styling**
- A. Plain CSS with custom properties (the current `index.css` approach). No new dependencies, enough for a small app.
- B. Tailwind and shadcn/ui, as `architecture.md` proposed.
- **Recommendation: A for now.** The app has a few screens. Adding Tailwind and shadcn now is extra setup with little gain. This reverses the earlier proposal, so please confirm it.

**Opening library loading** is not an open choice: `openings.json` is loaded with a dynamic `import()` only when the "Start from an opening" search opens. Vite splits it into its own chunk.

## Visual direction

From `ui-ux-pro-max`, the closest matching style is "Minimalism & Swiss Style": white space, a grid layout, one accent color, sans-serif type, no decorative shadows, clear hierarchy. The search also suggested a "Dark Mode (OLED)" option, but that result was for a FAQ landing page and I did not adopt it. The recommended tool-style results (claymorphism, playful colors) are for kids' apps and do not fit.

Searches run for this section (from `ui-ux-pro-max`):
- `touch target size` (ux): the guidance is platform-specific. For web, WCAG 2.2 AA requires 24×24 CSS px; the 44 pt and 48 dp figures are for native apps. Varianto is a web app, so 24 px is the floor. For move-list rows on phones I will use a taller row (my call, about 44 px) because the list is the main tap target.
- `keyboard nav` (ux): tab order must follow visual order, every action must work without a pointer, and a skip-to-content link is recommended on nav-heavy pages.
- `chess board` (product): the matching result was for a card/board game with felt and wood textures. Not adopted, because Varianto is a study tool, not a game.
- Stack search for `html-tailwind` ("tree view nested list") returned no match. Stack-specific notes come from the chosen CSS approach instead.

Proposed (my call, to be checked on a mockup):
- System font stack, no web font download.
- One accent color for the selected move and primary buttons; neutrals for everything else.
- Flat surfaces with 1 px borders. No gradients.
- Visible focus rings (2 px) on every interactive element, never removed.
- Touch targets at least 24 px on web; move-list rows and board action buttons at about 44 px.
- Skip-to-content link at the top of each page.
- Board and move list side by side on wide screens, stacked on phones.
- Move list is a keyboard-navigable list: arrow keys move the selection, Enter plays or selects.

## Parts of the how (decided here)

- Repertoire id and node ids come from `crypto.randomUUID()` through the existing `IdFactory`.
- Adding a move: `addMove(rep, selectedNodeId, san)`, then `store.save(rep)`. Illegal moves are rejected by chess.js and shown as a short message; the board snaps back.
- Opening import: `addOpeningToRepertoire(rep, line, newId)` on an empty repertoire created with the chosen color.
- Deleting a move: `deleteNode`, then select the parent.
- Comments: `setComment`, saved on blur or after a short pause.
- Save failures: show a message that data was not saved, and keep the in-memory state so the user can retry.
- Empty repertoire list: the empty state from the Home section above.

## Testing

- Domain code that is new (store-facing helpers, any selection logic) gets Vitest tests written first.
- UI is checked in the browser by hand, following the Phase 2 acceptance flow: create from an opening, add a branch, comment, delete, export, import on a fresh profile.
- `npx vitest run`, `npm run build`, and `npm run lint` must pass before completion.

## Left to the builder

- Exact component split inside `src/ui/`.
- Exact keyboard shortcuts for move navigation.
- Exact copy for buttons and empty states (English).
- Whether the comment box saves on blur or on a debounce timer.

## Open questions for the owner

- Confirm the three recommendations above (hash routing, Zustand store, plain CSS).
- Confirm the visual direction once a mockup is shown.
