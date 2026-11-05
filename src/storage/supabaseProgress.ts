import type { DrillResult } from '../domain/learn/drill'
import type { ReviewCard } from '../domain/learn/review'
import type { DrillRecord, ProgressStore } from './progress'

/** A review card as JSON: the dates are ISO strings. */
export type CardJson = Record<string, unknown>

/** The remote calls the store needs. Cards and drill results travel as JSON. */
export interface ProgressGateway {
  /** Idempotent. */
  addLearned(courseId: string, lineKey: string): Promise<void>
  listLearned(courseId?: string): Promise<{ courseId: string; lineKey: string }[]>
  /** Removes learned lines, review cards and drill results of the course. */
  deleteCourse(courseId: string): Promise<void>
  upsertReview(courseId: string, lineKey: string, card: CardJson): Promise<void>
  listReviews(courseId: string): Promise<{ lineKey: string; card: CardJson }[]>
  addDrill(courseId: string, result: DrillResult, at: number): Promise<void>
  listDrills(courseId: string): Promise<(DrillResult & { at: number })[]>
  /** Idempotent. */
  addActivity(day: string): Promise<void>
  listActivity(): Promise<string[]>
}

const DATE_FIELDS = ['due', 'last_review'] as const

function encodeCard(card: ReviewCard): CardJson {
  return JSON.parse(JSON.stringify(card)) as CardJson
}

function decodeCard(json: CardJson): ReviewCard {
  const card: CardJson = { ...json }
  for (const field of DATE_FIELDS) {
    if (typeof card[field] === 'string') card[field] = new Date(card[field])
  }
  return card as unknown as ReviewCard
}

/** Learn-mode progress in the user's Supabase account. */
export class SupabaseProgressStore implements ProgressStore {
  private readonly gateway: ProgressGateway

  constructor(gateway: ProgressGateway) {
    this.gateway = gateway
  }

  markLearned(courseId: string, lineKey: string): Promise<void> {
    return this.gateway.addLearned(courseId, lineKey)
  }

  async learnedLines(courseId: string): Promise<Set<string>> {
    const rows = await this.gateway.listLearned(courseId)
    return new Set(rows.map((r) => r.lineKey))
  }

  async learnedCounts(): Promise<Map<string, number>> {
    const counts = new Map<string, number>()
    for (const row of await this.gateway.listLearned()) {
      counts.set(row.courseId, (counts.get(row.courseId) ?? 0) + 1)
    }
    return counts
  }

  reset(courseId: string): Promise<void> {
    return this.gateway.deleteCourse(courseId)
  }

  async reviewCards(courseId: string): Promise<Map<string, ReviewCard>> {
    const rows = await this.gateway.listReviews(courseId)
    return new Map(rows.map((r) => [r.lineKey, decodeCard(r.card)]))
  }

  saveReview(courseId: string, lineKey: string, card: ReviewCard): Promise<void> {
    return this.gateway.upsertReview(courseId, lineKey, encodeCard(card))
  }

  addDrillResult(courseId: string, result: DrillResult, at: number): Promise<void> {
    return this.gateway.addDrill(courseId, result, at)
  }

  recordActivity(day: string): Promise<void> {
    return this.gateway.addActivity(day)
  }

  async activityDays(): Promise<string[]> {
    return [...new Set(await this.gateway.listActivity())].sort()
  }

  async drillResults(courseId: string): Promise<DrillRecord[]> {
    const rows = await this.gateway.listDrills(courseId)
    return rows
      .map((r) => ({
        passed: r.passed,
        failed: r.failed,
        durationMs: r.durationMs,
        elapsedMs: r.elapsedMs,
        at: r.at,
      }))
      .sort((a, b) => b.at - a.at)
  }
}
