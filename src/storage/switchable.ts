import type { DrillResult } from '../domain/learn/drill'
import type { ReviewCard } from '../domain/learn/review'
import type { Repertoire } from '../domain/repertoire/tree'
import type { DrillRecord, ProgressStore } from './progress'
import type { RepertoireStore, RepertoireSummary } from './store'

// Each method reads `this.current` once, synchronously, so a call that has started
// finishes on the backend it started on even if use() swaps the backend meanwhile.

/** A repertoire store whose backend can be swapped, for login and logout. */
export class SwitchableRepertoireStore implements RepertoireStore {
  private current: RepertoireStore

  constructor(initial: RepertoireStore) {
    this.current = initial
  }

  use(next: RepertoireStore): void {
    this.current = next
  }

  save(rep: Repertoire): Promise<void> {
    return this.current.save(rep)
  }
  saveMany(reps: Repertoire[]): Promise<void> {
    return this.current.saveMany(reps)
  }
  load(id: string): Promise<Repertoire | undefined> {
    return this.current.load(id)
  }
  loadAll(): Promise<Repertoire[]> {
    return this.current.loadAll()
  }
  list(): Promise<RepertoireSummary[]> {
    return this.current.list()
  }
  remove(id: string): Promise<void> {
    return this.current.remove(id)
  }
}

/** A progress store whose backend can be swapped, for login and logout. */
export class SwitchableProgressStore implements ProgressStore {
  private current: ProgressStore

  constructor(initial: ProgressStore) {
    this.current = initial
  }

  use(next: ProgressStore): void {
    this.current = next
  }

  markLearned(courseId: string, lineKey: string): Promise<void> {
    return this.current.markLearned(courseId, lineKey)
  }
  learnedLines(courseId: string): Promise<Set<string>> {
    return this.current.learnedLines(courseId)
  }
  learnedCounts(): Promise<Map<string, number>> {
    return this.current.learnedCounts()
  }
  reset(courseId: string): Promise<void> {
    return this.current.reset(courseId)
  }
  reviewCards(courseId: string): Promise<Map<string, ReviewCard>> {
    return this.current.reviewCards(courseId)
  }
  saveReview(courseId: string, lineKey: string, card: ReviewCard): Promise<void> {
    return this.current.saveReview(courseId, lineKey, card)
  }
  addDrillResult(courseId: string, result: DrillResult, at: number): Promise<void> {
    return this.current.addDrillResult(courseId, result, at)
  }
  drillResults(courseId: string): Promise<DrillRecord[]> {
    return this.current.drillResults(courseId)
  }
}
