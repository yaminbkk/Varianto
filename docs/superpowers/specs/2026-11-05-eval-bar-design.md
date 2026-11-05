# Evaluation bar (Stockfish) design

Date: 2026-11-05 · Status: draft for approval

## Intent and why

ChessReps shows an evaluation bar beside the board while you learn a line. Varianto has no engine yet, so a learner cannot see why a "fine" move is worse than the course move, or how big an advantage an opening gives. The spec lists this under V1 ("Engine eval bar, Stockfish WASM, can be toggled, runs locally").

Goal: a vertical bar next to the board that shows who is better and by how much, computed by Stockfish running in the learner's browser.

## Goals

- Eval bar on the **Learn** page and the **repertoire board** page.
- Off by default; the on/off choice is remembered on the device (same pattern as the sound toggle).
- Works fully offline once the page is loaded, on GitHub Pages, with no special headers.
- Costs nothing when off: no engine bytes are downloaded, no worker is started.
- Keeps working when the engine cannot load: the rest of the page is unaffected.

## Non-goals

- No best-move arrows, multi-line analysis, or "analysis board" (a separate later item).
- No eval on **Practice** or **Drill**: the eval would give the answer away.
- No full-strength engine, no multi-threaded engine, no engine opponent.
- No cloud evaluation (Lichess etc.).

## Anti-goals

- Any network call from a guest session, or loading the engine for users who did not turn the bar on.
- A change that makes the main bundle bigger.
- Letting a slow or failed engine freeze or break the lesson.

## Constraints

- GPL-3.0 project: Stockfish.js is GPL-3.0, so it is allowed. The licence text must ship with the deployed files and the app should credit Stockfish in the UI.
- `src/domain/` must not import React or the DOM; domain functions are pure.
- Site is served under a base path (`/Varianto/`) on GitHub Pages, which cannot send COOP/COEP headers.
- No analytics, no new backend.

## Approaches considered

|                | What                                                                                                                    | Trade-off                                                                                                       |
| -------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **A (chosen)** | `stockfish` npm package, `lite-single` build (~1.8 MB wasm), run as a Web Worker, loaded only when the bar is turned on | Simple, updatable, licence included. Package unpacks to ~205 MB in `node_modules`/CI (not in the deployed site) |
| B              | Commit the lite-single files into the repo                                                                              | Light install, but binaries in git and manual updates                                                           |
| C              | Multi-threaded lite build                                                                                               | Faster, but needs COOP/COEP, which Pages cannot send without a service-worker workaround                        |

Cloud-eval APIs were rejected: they are network calls and break guest mode. Chosen: **A**, because it is the least complex option that meets every constraint.

## Design

### Domain (`src/domain/eval/`, pure, TDD)

- `uci.ts`: parse an engine `info ... depth D ... score cp N | score mate N ...` line into `{ kind: 'cp' | 'mate', value, depth }`. UCI scores are from the side to move; convert to **White's point of view** using the FEN.
- `bar.ts`: map an evaluation to a bar fill (0 to 1, White's share) and a label. Centipawns use the Lichess win-percentage curve `50 + 50 * (2 / (1 + exp(-0.00368208 * cp)) - 1)`. Mate scores fill the bar fully for the winner and read `M3`. Labels read `+0.3`, `-1.2`, `0.0`.
- Terminal positions are decided without the engine (the engine returns no score for them): checkmate fills for the winner (label `1-0` / `0-1`), stalemate and insufficient material read `0.0`.

### Engine (`src/engine/`, no React)

- `session.ts`: takes a small `EngineTransport` (`post(command)`, `onMessage(handler)`, `terminate()`), so it can be tested with a fake. Does the `uci` / `isready` handshake, sets a small hash, and runs `position fen ... ` then `go depth 14`. A new request sends `stop` first and ignores output belonging to the old request. Results are cached per FEN for the session so stepping through a line is instant. Reports progress (each deeper `info`) and a final result; reports an error state if the worker fails.
- `worker.ts`: the only file that creates the real `Worker`. It points at the unmodified `stockfish-19-lite-single.js`, with the `.wasm` file next to it.
- Asset delivery: a small script copies `stockfish-19-lite-single.js`, its `.wasm`, and `Copying.txt` from `node_modules/stockfish/bin` into `public/stockfish/` before `dev` and `build` (generated, git-ignored). The URL is built from `import.meta.env.BASE_URL`. Files are copied unmodified, because the engine finds its wasm by file name, so Vite's hashed renaming must be avoided.

### UI

- `EvalBar.tsx`: vertical bar beside the board, White at the bottom (flips with board orientation), numeric label, dimmed while the search is still shallow, "Engine unavailable" state. Exposes `role="img"` with an `aria-label` such as "Evaluation: White ahead, +0.3" (not a live region, to avoid chatter). Fill transition is disabled under `prefers-reduced-motion`.
- `useEvaluation(fen, enabled)` hook: lazy-creates the session on first enable, debounces rapid FEN changes (~150 ms), terminates the worker when turned off or unmounted.
- A toggle button "Eval bar: on/off" next to the existing Sound button, stored under `varianto.evalbar` in `localStorage` (failures mean "off").
- A short "Stockfish (GPL-3.0)" credit near the toggle, and a line in the README.

### Behaviour notes

- In Learn, the bar evaluates the **current** board position, so it also moves after a wrong move (as the ChessReps survey observed).
- Engine failure (no WASM support, load error) shows the unavailable state and never throws into the page.

## Decisions made by the builder (not the user)

Analysis depth 14; 150 ms debounce; 16 MB hash; per-session FEN cache; placement left of the board; copy-script delivery instead of a Vite plugin; pin `stockfish` to exactly `19.0.1`.

## Verification

- Unit tests: UCI parsing (cp, mate, perspective flip), bar mapping and labels, terminal positions, session logic with a fake transport (handshake, stale-result dropping, cache hit, failure), preference storage.
- `npx vitest run`, `npm run build`, `npm run lint` all pass.
- Build output check: the main chunk does not grow; the engine files are present under the base path.
- Browser check on the **built** site served with the `/Varianto/` base: with the bar off, no request for `stockfish/*`; after turning it on, the engine loads, the bar moves as moves are played, and the bar flips with the board.

## Left to the builder

CSS details, exact label rounding, wording of the unavailable message, and the file layout inside the folders above.

## Risks

- Worker/wasm loading under a base path is the main technical risk; the browser check on the built site is mandatory, not optional.
- `npm ci` in CI downloads the full package (~205 MB); acceptable, to be watched.
