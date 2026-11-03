# Opening Library: Design

Status: approved and implemented.
Date: 2026-11-03

## Intent

Users should be able to browse named chess openings and their main lines from the start, without writing any content themselves. A browsed line can be added to the user's own repertoire. The library is reference data, not a set of repertoires that we author.

## Goals

- Ship a built-in list of named opening lines (ECO-style) with the app.
- Work fully offline in guest mode: no network calls at runtime.
- Keep the data reproducible: the same source files always produce the same bundled output.
- Give credit to the source in the project.

## Non-goals

- Covering every sub-variation of every opening. The source has 3,865 named lines; deeper variations are out of scope for now.
- Authoring or curating repertoires. Sample repertoires are not part of this work.
- A browse UI. The screen that uses this data is designed separately (after Phase 2 item 5 and 6).
- Accounts or sync. The library is the same for guest and logged-in users.

## Anti-goals

- Fetching openings from Lichess or any other service while the app runs.
- Copying a third party's course or study content. Only the factual opening names and move sequences from the CC0 dataset are used.

## Constraints

- Source: `lichess-org/chess-openings` at commit `712a58be746c143f4ab935b68acc50f4bac813eb`, license CC0-1.0 (verified through the GitHub API; `COPYING.txt` is the CC0 1.0 legal code).
- Source files: `a.tsv` to `e.tsv`, with columns `eco`, `name`, `pgn`. Entries total 3,865.
- `src/domain/` must not import React or the DOM.
- Rules and move legality come from `chess.js`, which is already a dependency.
- GPL-3.0 compatibility: CC0 content can be included in a GPL-3.0 project.

## Approaches

1. **Build-time generation (chosen).** Vendor the five TSV files into `data/openings/`. A Node script in `scripts/` validates each `pgn` with `chess.js` and writes `src/data/openings.json`. The app imports the JSON as a static module.
   - Trade-off: the generated JSON is committed or regenerated on build, which adds a step. The result has no runtime cost and no network.
2. **Runtime fetch from a CDN or GitHub.** Rejected: it breaks the guest-mode rule of no network calls and makes the app depend on a third party being reachable.
3. **Hand-typed list.** Rejected: slow, error-prone, and does not match the scope the user asked for.

## Design

**Data type** (`src/domain/openings/types.ts`):

```ts
export interface OpeningLine {
  eco: string   // e.g. "A00"
  name: string  // e.g. "Amar Opening: Paris Gambit"
  pgn: string   // moves from the start position, SAN
}
```

**Validation and generation** (`scripts/build-openings.ts`):
- Parse each TSV row. Reject rows where `pgn` is not fully legal according to `chess.js`, and fail the build with the row number.
- Reject duplicate `(eco, name, pgn)` triples. The same name may appear with different lines (266 such name pairs exist in the source), so the identifier is the full triple. The `pgn` part of the key is compared ignoring move-number spacing (`1.Nh3` and `1. Nh3` are the same line).
- Write sorted, stable output to `src/data/openings.json`.

**Domain functions** (`src/domain/openings/`):
- `findOpenings(lines, query)`: case-insensitive search on `name` and `eco`. Pure and returns a new array.
- `addOpeningToRepertoire(rep, line, newId)`: uses the existing `importPgn` to add a line to a repertoire. No new tree logic.

**Attribution:** add a `NOTICE` entry (or a section in the README) that names the source, the commit SHA, and the CC0 license.

## Testing

- Unit test: the generator rejects an illegal move and reports the row.
- Unit test: the generator rejects an exact duplicate entry and accepts two entries that share eco and name but differ in pgn.
- Unit test: the committed `openings.json` matches a fresh generation (guards against drift).
- Unit test: `findOpenings` returns matches for name and ECO code, and does not mutate its input.

## Left for the builder

- Exact file layout under `data/` and `src/data/`.
- Whether `openings.json` is committed or generated in `prebuild`. Default: committed, plus a test that checks it is current.
- Bundle size check. Default: keep the JSON under about 500 KB; if it is larger, load it lazily.
  - Result: the generated `src/data/openings.json` is about 592 KB, over the 500 KB default. The UI task that imports it must load it lazily (dynamic `import()`), so it stays out of the main bundle.

## Open question

- Which repertoire the Phase 2 item 5 board edits (auto-created one, or a creation form). This doc does not depend on that answer, but the browse UI will.
