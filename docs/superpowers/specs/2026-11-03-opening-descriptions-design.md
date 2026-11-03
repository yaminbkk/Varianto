# Opening descriptions and an openings browser: design

Date: 2026-11-03 · Status: draft for approval · Size: a small project (short design)

## Intent

Varianto is currently only a repertoire builder. The opening library (about 3,865 lines: ECO, name, PGN) is used only as a search list behind "Start from an opening". The owner wants openings to be content of the website itself: a visitor should be able to browse openings and read what each one is about, in the spirit of ChessReps' course cards and per-move explanations, without copying anything from ChessReps.

## Goals

- A browsable openings section: a list or search, and a page per opening with a board that steps through its moves, a short description, and a "Start a repertoire from this opening" action.
- Original, accurate descriptions for the most popular openings.
- Every opening still shows useful, true information even without a written description.
- Everything stays local-first: static data shipped with the app, no network calls, no account.

## Non-goals and anti-goals

- No ChessReps text, code, assets, or branding. Their notes (`.md.local/chessreps-observations.md`) are used only for behaviour: a short description on an opening card, and an explanation of the idea behind a move.
- No invented facts: no player names, statistics, or historical claims that cannot be checked.
- Not in this phase: per-move explanations for every opening, engine evaluation, popularity statistics, translations (Thai/English i18n stays a V1 item).
- Anti-goal: a long list of confident but wrong chess text. Fewer descriptions that are right beat many that are wrong.

## Constraints

- Everything in the repo is English, including the descriptions.
- GPL-3.0 compatible content only. The opening data is CC0 (`data/openings/SOURCE.md`, `COPYING.txt`); written descriptions are our own work under the project license.
- `src/domain/` must not import React or the DOM; domain functions are immutable.
- Tests first; `npx vitest run`, `npm run build`, `npm run lint` must pass before any claim of completion.
- Keep the main bundle small: descriptions and the openings list load as separate chunks, as the opening library already does.
- Token budget: AI-written text is limited to the curated set below.

## Approaches considered

1. **Write descriptions for every opening with AI.** About 450,000 to 600,000 output tokens plus a review pass, and a high risk of wrong text spread over 3,865 entries that nobody can check. Rejected.
2. **Curated descriptions for popular openings, generated facts for the rest (recommended and chosen by default).** AI drafts original 2 to 4 sentence descriptions for roughly 100 well-known openings, checked against their moves and reviewed by the owner. Every other opening shows facts computed from the data: ECO group, name family, move count, side to move, the main line. Cheap (about 12,000 to 30,000 tokens), reviewable, and extendable later.
3. **Only generated facts, no prose.** Zero AI cost and zero risk, but it does not give the "explains the opening" feel the owner asked for. Kept as the fallback for anything without a curated description.

## Design

### Data

- New file `src/data/opening-descriptions.json`: a map from a stable opening key (the ECO code plus the normalized name) to `{ summary: string, ideas?: string[] }`. `ideas` is optional and holds at most three short plan bullets.
- It is loaded lazily on the openings pages, separate from the main bundle.
- Per-move explanations are out of scope, but the file shape leaves room for a later `moves` field.

### Domain (`src/domain/openings/`, pure and tested)

- `describe(line, descriptions)`: returns the curated description if present, otherwise generated facts (ECO group label such as "Open Games (C20-C99)", move count, who moves first after the line, the line in SAN).
- `openingKey(line)`: stable key function, tested for uniqueness over the whole library.
- `relatedOpenings(line, all)`: lines that share the first moves, to show "variations of this opening" (optional, small).
- A data test that checks every curated description: the key exists in the library, the text is non-empty, and the length is within bounds. A script validates that any move written in a description exists in the opening's PGN (using chess.js).

### UI

- New routes: `#/openings` (search plus list grouped by ECO family) and `#/openings/<key>` (read-only board, move stepper, description or generated facts, and a "Start a repertoire from this opening" button that reuses `fromOpening`).
- The home page links to the openings section.
- The board component gets a read-only mode (no moves played, no store). It reuses the same chessground wrapper.
- The existing "Start from an opening" picker keeps working and can link to the opening page.

### Content process

1. Pick the roughly 100 openings by family, from the main ECO families and common names (an initial list is proposed in the implementation plan).
2. Draft each summary from its PGN only. Allowed content: what the first moves do (center control, development, king safety), the typical plan for each side, and the name's origin only when well established. Not allowed: statistics, named players, claims of strength.
3. Run the validation script, then the owner reviews the batch. Nothing is published unreviewed.

## Decisions

- The owner decided: openings should be part of the website, descriptions are written in the spirit of ChessReps without copying it, AI writing must be accurate, and the owner is concerned about token cost.
- My calls, to check: scope is opening-level only for now; roughly 100 curated openings; descriptions in English; storage as one JSON file; generated facts as the fallback.

## Left to the builder

- Exact key format and the final curated list.
- Visual layout of the openings list and the opening page (the repo's design guidance from `ui-ux-pro-max` applies).
- Whether `relatedOpenings` ships in this phase.

## Resolved on approval (2026-11-03)

The owner approved the design without answering the two open questions, so the recommended defaults apply (my calls, easy to change):

- The curated list follows teaching value (what a beginner should learn first), not raw popularity.
- The first release has no per-move explanations. They come later, once opening-level descriptions are reviewed.
