# Varianto

A free and open-source chess opening trainer. Build your own repertoire, then drill it with spaced repetition.

> **Status: early development.** Nothing is usable yet. The scaffold and dependencies are in place; the repertoire model comes first.

## Goals

- **Local-first.** Your data lives in your browser (IndexedDB). No account needed, no trackers, no payments. An optional account (Supabase) syncs your data across devices.
- **Your repertoire.** Create lines for White or Black, branch them, add comments, import and export PGN.
- **Practice that sticks.** Spaced repetition (FSRS) schedules each position. Wrong moves are not punished: you can try again or undo.
- **Always portable.** Export and import all your data as JSON at any time.
- **Self-hostable.** It is a static site. Deploy it anywhere.

## Planned for the first release (MVP)

1. Repertoire builder with branches and per-move comments
2. PGN import and export (variations and comments supported)
3. Practice mode with hints
4. FSRS-based review scheduling
5. Basic progress: positions learned, due today, daily streak
6. Local storage with full JSON export and import
7. Settings: board theme, sound, font size

Also available: learn mode with explanations, drill mode, an optional Stockfish eval bar (see below), and a daily streak in the header (a day counts when you finish a line, review, or drill).

Later: dashboard, PWA, i18n.

## Tech stack

| Area              | Choice                                                                              |
| ----------------- | ----------------------------------------------------------------------------------- |
| App               | Vite, React, TypeScript (strict)                                                    |
| Board             | [chessground](https://github.com/lichess-org/chessground)                           |
| Rules and PGN     | [chess.js](https://github.com/jhlywa/chess.js)                                      |
| Spaced repetition | [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs)                        |
| Storage           | IndexedDB via [Dexie](https://dexie.org); optional [Supabase](https://supabase.com) |
| State and routing | Zustand, React Router                                                               |
| Engine            | [Stockfish.js](https://github.com/nmrugg/stockfish.js) (lite, single-threaded WASM) |
| Tests             | Vitest                                                                              |

## Development

Requires Node.js 22.12 or newer (Vitest needs 22.12+, 24+, or 26+).

```bash
npm install
npm run dev     # start the dev server
npm run build   # type-check and build
npm run lint    # oxlint
npm test        # vitest
```

## Privacy

Varianto does not collect analytics. As a guest it makes no network calls and your repertoire never leaves the browser. If you choose to sign in, your repertoires and progress are stored in your Supabase account and nowhere else. See [docs/deploy.md](docs/deploy.md).

## Eval bar

An optional evaluation bar sits beside the board on the Learn page and the repertoire board page. It is off by default. When you turn it on, Stockfish (lite, single-threaded WebAssembly, about 1.8 MB) is downloaded from the site itself and runs in a Web Worker on your device. Nothing is sent anywhere. Practice and Drill never show it, because it would give the answer away.

`npm run dev` and `npm run build` copy the engine files from `node_modules/stockfish` into `public/stockfish/` (git-ignored) with `scripts/copy-stockfish.mjs`.

## License

Varianto is licensed under the [GNU General Public License v3.0](LICENSE) (GPL-3.0-only). Dependencies such as chessground and Stockfish.js are GPL licensed, which is why this project uses the same license. The Stockfish licence text ships with the site in `stockfish/Copying.txt`.

## Credits

The opening library is built from the [lichess-org/chess-openings](https://github.com/lichess-org/chess-openings) dataset, released under CC0-1.0. See [data/openings/SOURCE.md](data/openings/SOURCE.md) for the pinned commit and details.
