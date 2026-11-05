import type { DrillResult } from '../domain/learn/drill'
import type { ReviewCard } from '../domain/learn/review'

/** A saved drill: its result and when it finished (epoch milliseconds). */
export type DrillRecord = DrillResult & { at: number }

/** Persistence boundary for learn-mode progress. Implementations must not leak backend types. */
export interface ProgressStore {
  /** Records the line as learned. Marking the same line again changes nothing. */
  markLearned(courseId: string, lineKey: string): Promise<void>
  /** Keys of the lines learned in the course. */
  learnedLines(courseId: string): Promise<Set<string>>
  /** Number of learned lines per course, for every course that has any. */
  learnedCounts(): Promise<Map<string, number>>
  /** Forgets all progress in the course: learned lines, review cards, and drill results. */
  reset(courseId: string): Promise<void>
  /** The review card of each reviewed line in the course, by line key. */
  reviewCards(courseId: string): Promise<Map<string, ReviewCard>>
  /** Stores the card for a line, replacing any earlier one. */
  saveReview(courseId: string, lineKey: string, card: ReviewCard): Promise<void>
  /** Stores a finished drill. */
  addDrillResult(courseId: string, result: DrillResult, at: number): Promise<void>
  /** Finished drills in the course, newest first. */
  drillResults(courseId: string): Promise<DrillRecord[]>
  /** Marks a local calendar day (`YYYY-MM-DD`) as one the learner practised. Marking a day twice changes nothing. */
  recordActivity(day: string): Promise<void>
  /** Every day the learner practised, oldest first. Not tied to a course, so resetting a course keeps it. */
  activityDays(): Promise<string[]>
}
