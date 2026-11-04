import type { ProgressStore } from './progress'
import type { RepertoireStore } from './store'

export interface Backend {
  repertoires: RepertoireStore
  progress: ProgressStore
}

export interface CopySummary {
  repertoires: number
  lines: number
}

/**
 * Copies every repertoire and all learn progress from one backend into another, for example
 * from the guest's browser into a new account. The source is not changed, and copying twice
 * leaves the target as it is after the first time.
 */
export async function copyLocalToAccount(from: Backend, to: Backend): Promise<CopySummary> {
  const reps = await from.repertoires.loadAll()
  if (reps.length > 0) await to.repertoires.saveMany(reps)

  // Reviews and drills only exist for courses that have learned lines.
  const counts = await from.progress.learnedCounts()
  let lines = 0
  for (const courseId of counts.keys()) {
    const learned = await from.progress.learnedLines(courseId)
    for (const lineKey of learned) await to.progress.markLearned(courseId, lineKey)
    lines += learned.size

    for (const [lineKey, card] of await from.progress.reviewCards(courseId)) {
      await to.progress.saveReview(courseId, lineKey, card)
    }

    const existing = new Set(
      (await to.progress.drillResults(courseId)).map((d) => JSON.stringify(d)),
    )
    for (const { at, ...result } of await from.progress.drillResults(courseId)) {
      if (!existing.has(JSON.stringify({ ...result, at }))) {
        await to.progress.addDrillResult(courseId, result, at)
      }
    }
  }
  return { repertoires: reps.length, lines }
}
