import { createEmptyCard, fsrs, Rating, type Card } from 'ts-fsrs'

/** The FSRS state of one learned line. */
export type ReviewCard = Card

export type Grade = 'again' | 'hard' | 'good'

const scheduler = fsrs()

const RATINGS = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
} as const

/** How well a practice run went: mistakes or Solve mean it was forgotten, a hint means it was hard. */
export function gradeFor(result: { mistakes: number; hinted: boolean; solved: boolean }): Grade {
  if (result.solved || result.mistakes > 0) return 'again'
  return result.hinted ? 'hard' : 'good'
}

/** The card after a review at `now`. A line never reviewed before starts from an empty card. */
export function schedule(card: ReviewCard | null, grade: Grade, now: Date): ReviewCard {
  return scheduler.next(card ?? createEmptyCard(now), now, RATINGS[grade]).card
}

/**
 * The learned lines to review now. A line with no card has never been reviewed, so it comes first;
 * the rest follow by earliest due date.
 */
export function dueKeys(
  cards: ReadonlyMap<string, ReviewCard>,
  learned: ReadonlySet<string>,
  now: Date,
): string[] {
  const due: { key: string; at: number }[] = []
  for (const key of learned) {
    const card = cards.get(key)
    if (!card) due.push({ key, at: Number.NEGATIVE_INFINITY })
    else if (card.due.getTime() <= now.getTime()) due.push({ key, at: card.due.getTime() })
  }
  return due.sort((a, b) => (a.at === b.at ? 0 : a.at < b.at ? -1 : 1)).map((d) => d.key)
}
