import type { VariantoDb } from './db'
import type { ProgressStore } from './progress'

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
    await this.db.learned.where('courseId').equals(courseId).delete()
  }
}
