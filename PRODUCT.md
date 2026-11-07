# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Confirmed by the owner: two groups of equal weight.

- **Beginners** who have just started drilling openings and need a guided way to learn lines move by move.
- **Intermediate players** who already have a repertoire (often from online play) and want to build it, store it, and not forget it.

[Inferred from the spec, not confirmed in detail: they practise in short sessions, on desktop and phone, often between games.]

## Product Purpose

A free, open-source, local-first chess opening trainer. Learn openings through guided lessons with explanations, build your own repertoire, and review it with spaced repetition (FSRS). Success: a new user completes a first lesson or review round within minutes, without signing up, and their data and schedules survive closing the tab.

## Positioning

Confirmed by the owner: both of these together.

- Free, open source, data stays on the device. No required account, no trackers, no paid tier. Self-hostable as a static site.
- Ships 99 ready-made opening courses (3,789 lines) that can be learned immediately without building anything first.

## Operating Context

Hash-routed single-page app (Vite, React, TypeScript). Guest mode is the default and works fully offline-first from IndexedDB. An optional Supabase account syncs data across devices. Optional local Stockfish eval bar. Daily streak counts a day when a line, review, or drill is finished.

## Capabilities and Constraints

- Guest mode must work fully with no network calls; accounts are optional.
- Board is chessground; rules via chess.js; GPL-3.0 licence.
- App code talks to storage only through the `RepertoireStore` interface.
- No analytics or trackers.
- Everything in the repo, including UI text, is in English. Thai and English i18n is a later goal (spec V1).
- Not confirmed by the owner (recorded as open): whether mobile is the primary device, and the required accessibility standard.

## Brand Commitments

Name "Varianto" and the current V logo mark are existing assets. [Inferred: not stated as untouchable; treat as kept unless the owner says otherwise.]

## Evidence on Hand

Real opening data in `data/` and `public/` (99 courses, 3,789 lines). No testimonials, usage numbers, or user research exist; none may be invented.

## Product Principles

1. The board is the product; every surface serves getting moves onto it.
2. Mistakes cost nothing: wrong moves are recoverable, never punished.
3. The user's data is theirs: local first, exportable always.
4. Show the next useful step before showing the whole catalogue.

## Accessibility & Inclusion

No product-specific standard confirmed. [Inferred working floor: WCAG AA contrast, full keyboard use, reduced-motion respected; the app already has a skip link and reduced-motion handling.]
