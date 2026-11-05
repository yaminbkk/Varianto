# Daily streak design

Date: 2026-11-05 · Status: written under the user's "keep going" instruction (questions opted out); decisions below are the builder's calls and are open to correction.

## Intent

A daily streak ("practised N days in a row") encourages the daily review habit that spaced repetition depends on. It is MVP item 5 in the spec ("daily streak"). It must stay local-first: no server needed, no tracking.

## Goals

- Count a **day as active** when the learner finishes a Learn line, saves a Practice review, or finishes a Drill.
- Show the current streak (and whether today is already done) in the app header.
- Works for guests (Dexie) and for signed-in users (Supabase) through the same `ProgressStore`.

## Non-goals

- Heatmap/dashboard (a later item), reminders or notifications, leaderboards, streak freezes.
- Back-filling past days: existing progress has no per-day history, so streaks start counting from the first activity after this ships.

## Anti-goals

- Any network call for guests, any analytics, or a change that makes existing progress data unreadable.

## Approach

The progress data keeps only the latest review card per line, so a streak cannot be derived from it. We add a small separate record of active days.

- **Chosen:** store a set of local calendar days (`YYYY-MM-DD`). `ProgressStore` gains `recordActivity(day)` (idempotent) and `activityDays()`. A decorator `withActivity(store, clock)` records the day whenever `markLearned`, `saveReview` or `addDrillResult` is called, so no page needs changing.
- Rejected: deriving from `last_review` (loses repeat days); storing a running counter (cannot be merged or repaired, and breaks when two devices disagree).

## Design

- Domain `src/domain/learn/streak.ts`: `localDay(date: Date): string` and `streakInfo(days, today): { current, longest, activeToday }`. The current streak is the run of consecutive days ending today, or ending yesterday when today is not done yet (the streak is still alive).
- Guest: Dexie version 4 adds an `activity` table keyed by day.
- Account: new table `activity_days (user_id, day)` with the same row-level security as the other tables (migration `0002`), plus gateway methods. `copyLocalToAccount` copies days too (union, never deleting).
- UI: a small header badge "N-day streak" with an "active today" state; hidden when the streak is 0 and nothing was done today? No: shown as "Start a streak" only on the home page. Text must be readable without colour or icon alone.

## Left to the builder

Exact copy and styling of the badge; file layout inside the folders above.
