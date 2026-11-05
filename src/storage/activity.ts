import type { DrillResult } from '../domain/learn/drill'
import type { ReviewCard } from '../domain/learn/review'
import { localDay } from '../domain/learn/streak'
import type { DrillRecord, ProgressStore } from './progress'

const listeners = new Set<() => void>()

/** Calls `listener` after a practice day has been recorded. Returns a function that stops listening. */
export function onActivityRecorded(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * Wraps a progress store so that finishing a line, saving a review or saving a drill also
 * marks today (the learner's local date) as a day practised. The day is recorded after the
 * progress is saved, and a failure to record it never fails the save.
 */
export function withActivity(
  inner: ProgressStore,
  now: () => Date = () => new Date(),
): ProgressStore {
  async function saved(save: Promise<void>): Promise<void> {
    await save
    try {
      await inner.recordActivity(localDay(now()))
      for (const listener of [...listeners]) listener()
    } catch {
      // The streak may miss a day; the learner's progress must not.
    }
  }

  return {
    markLearned: (courseId: string, lineKey: string) => saved(inner.markLearned(courseId, lineKey)),
    saveReview: (courseId: string, lineKey: string, card: ReviewCard) =>
      saved(inner.saveReview(courseId, lineKey, card)),
    addDrillResult: (courseId: string, result: DrillResult, at: number) =>
      saved(inner.addDrillResult(courseId, result, at)),
    learnedLines: (courseId: string): Promise<Set<string>> => inner.learnedLines(courseId),
    learnedCounts: () => inner.learnedCounts(),
    reset: (courseId: string) => inner.reset(courseId),
    reviewCards: (courseId: string) => inner.reviewCards(courseId),
    drillResults: (courseId: string): Promise<DrillRecord[]> => inner.drillResults(courseId),
    recordActivity: (day: string) => inner.recordActivity(day),
    activityDays: () => inner.activityDays(),
  }
}
