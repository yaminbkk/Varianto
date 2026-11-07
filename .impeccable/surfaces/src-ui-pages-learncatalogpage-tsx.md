---
version: 1
slug: 'src-ui-pages-learncatalogpage-tsx'
primary_target: 'src/ui/pages/LearnCatalogPage.tsx'
related_targets: ['src/ui/pages/LessonPage.tsx']
---

# Surface brief: Learn catalog and lesson page

Mode: Operate. Visitors learn opening lines move by move and pick what to study. Build path: code-led (Operate). Unattended: the owner said "just do it", so no decision page was served; assigned direction taken, assumptions disclosed.

Audience, job: beginners and intermediate players (equal weight). Job: find the next opening to study, then play its moves with the instruction always beside the board.
Scope this round (owner-confirmed): P1 lesson layout, P1 catalog structure, P2 board coordinate legibility, P2 identity. Board/Drill/Practice pages untouched.
Constraints: PRODUCT.md; guest mode; domain logic stays in src/domain; no new dependencies.
Unresolved: popularity data does not exist, so catalog order uses line count as a stated proxy.

## Direction contract

THESIS: A chess opening trainer reads like a chess reference work, not a SaaS dashboard: the opening index is a ruled table of ECO volumes A to E, and the lesson speaks in Informator evaluation symbols. Refuses the uniform card wall and the green gradient hero.
OWN-WORLD: Chess Informator and ECO notation. Five volume hues (A flank, B semi-open, C open, D closed, E Indian) as the shell's committed colour job: section bands, card edge, row marker. Tinted neutral ground, ink text, hairline rules, tabular figures for line counts and coordinates. Symbols ! ? = as state glyphs. System sans stack, no hosted font. Recognisable with content removed by the five-hue volume bands.
STORY: A learner understands in two seconds that openings are grouped by volume and sorted by depth, resumes a half-learned course from the top, and in a lesson always sees what to play beside the board.
FIRST VIEWPORT: Catalog: one-line title with inline stats, search, two labelled filter groups (Side, First move), a Continue row when something is in progress, then volume A to E sections each with a hued heading and a dense card grid. Lesson: board left at full available height, instruction panel sticky beside it (above the board on phones, compact), settings tucked into one quiet row, progress shows "n of N".
FORM: assigned index 7 of my seven grounded candidates (Informator symbol and volume grammar); seed: d001db8c5c6db372.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
