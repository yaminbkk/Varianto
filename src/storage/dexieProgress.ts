import type { DrillResult } from '../domain/learn/drill'
import type { ReviewCard } from '../domain/learn/review'
import type { VariantoDb } from './db'
import type { DrillRecord, ProgressStore } from './progress'

export class DexieProgressStore implements ProgressStore {
  private readonly db: VariantoDb

  constructor(db: VariantoDb) {
    this.db = db
  }

  async markLearned(courseId: string, lineKey: string): Promise<void> {
    await this.db.learned.put({ courseId, lineKey })
  }

  async learnedLines(courseId: string): Promise<Set<string>> {
    const rows = await this.db.learned.where('courseId').equals(courseId).toArray()
    return new Set(rows.map((r) => r.lineKey))
  }

  async learnedCounts(): Promise<Map<string, number>> {
    const counts = new Map<string, number>()
    await this.db.learned.each((row) => {
      counts.set(row.courseId, (counts.get(row.courseId) ?? 0) + 1)
    })
    return counts
  }

  async reset(courseId: string): Promise<void> {
    await this.db.transaction('rw', this.db.learned, this.db.reviews, this.db.drills, async () => {
      await this.db.learned.where('courseId').equals(courseId).delete()
      await this.db.reviews.where('courseId').equals(courseId).delete()
      await this.db.drills.where('courseId').equals(courseId).delete()
    })
  }

  async reviewCards(courseId: string): Promise<Map<string, ReviewCard>> {
    const rows = await this.db.reviews.where('courseId').equals(courseId).toArray()
    return new Map(rows.map((r) => [r.lineKey, r.card]))
  }

  async saveReview(courseId: string, lineKey: string, card: ReviewCard): Promise<void> {
    await this.db.reviews.put({ courseId, lineKey, card })
  }

  async addDrillResult(courseId: string, result: DrillResult, at: number): Promise<void> {
    await this.db.drills.add({ ...result, courseId, at })
  }

  async recordActivity(day: string): Promise<void> {
    await this.db.activity.put({ day })
  }

  async activityDays(): Promise<string[]> {
    return (await this.db.activity.toArray()).map((r) => r.day).sort()
  }

  async drillResults(courseId: string): Promise<DrillRecord[]> {
    const rows = await this.db.drills.where('courseId').equals(courseId).toArray()
    return rows
      .sort((a, b) => b.at - a.at)
      .map((r) => ({
        passed: r.passed,
        failed: r.failed,
        durationMs: r.durationMs,
        elapsedMs: r.elapsedMs,
        at: r.at,
      }))
  }
}
