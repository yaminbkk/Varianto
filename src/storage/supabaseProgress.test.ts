import { describe, expect, it } from 'vitest'
import { schedule } from '../domain/learn/review'
import type { DrillResult } from '../domain/learn/drill'
import { SupabaseProgressStore, type ProgressGateway } from './supabaseProgress'

// In-memory gateway. Review cards and drill results pass through JSON, like the real wire,
// so dates arrive as strings.
function memoryGateway(): ProgressGateway {
  const learned = new Set<string>()
  const reviews = new Map<string, Record<string, unknown>>()
  const drills: { courseId: string; result: DrillResult; at: number }[] = []
  const activity = new Set<string>()
  const key = (courseId: string, lineKey: string) => JSON.stringify([courseId, lineKey])
  return {
    async addLearned(courseId, lineKey) {
      learned.add(key(courseId, lineKey))
    },
    async listLearned(courseId) {
      return [...learned]
        .map((k) => JSON.parse(k) as [string, string])
        .filter(([c]) => courseId === undefined || c === courseId)
        .map(([c, l]) => ({ courseId: c, lineKey: l }))
    },
    async deleteCourse(courseId) {
      for (const k of [...learned]) if (JSON.parse(k)[0] === courseId) learned.delete(k)
      for (const k of [...reviews.keys()]) if (JSON.parse(k)[0] === courseId) reviews.delete(k)
      for (let i = drills.length - 1; i >= 0; i--) {
        if (drills[i]!.courseId === courseId) drills.splice(i, 1)
      }
    },
    async upsertReview(courseId, lineKey, card) {
      reviews.set(key(courseId, lineKey), JSON.parse(JSON.stringify(card)))
    },
    async listReviews(courseId) {
      return [...reviews]
        .map(([k, card]) => ({ k: JSON.parse(k) as [string, string], card }))
        .filter(({ k }) => k[0] === courseId)
        .map(({ k, card }) => ({ lineKey: k[1], card }))
    },
    async addDrill(courseId, result, at) {
      drills.push({ courseId, result: JSON.parse(JSON.stringify(result)), at })
    },
    async listDrills(courseId) {
      return drills.filter((d) => d.courseId === courseId).map((d) => ({ ...d.result, at: d.at }))
    },
    async addActivity(day) {
      activity.add(day)
    },
    async listActivity() {
      return [...activity]
    },
  }
}

const result: DrillResult = { passed: 3, failed: 1, durationMs: 60000, elapsedMs: 42000 }

describe('SupabaseProgressStore', () => {
  it('records a learned line once', async () => {
    const store = new SupabaseProgressStore(memoryGateway())
    await store.markLearned('italian-game', 'a')
    await store.markLearned('italian-game', 'a')
    expect([...(await store.learnedLines('italian-game'))]).toEqual(['a'])
  })

  it('keeps courses apart and counts learned lines per course', async () => {
    const store = new SupabaseProgressStore(memoryGateway())
    await store.markLearned('italian-game', 'a')
    await store.markLearned('italian-game', 'b')
    await store.markLearned('french-defense', 'c')
    expect([...(await store.learnedLines('french-defense'))]).toEqual(['c'])
    expect((await store.learnedLines('unknown')).size).toBe(0)
    expect(await store.learnedCounts()).toEqual(
      new Map([
        ['italian-game', 2],
        ['french-defense', 1],
      ]),
    )
  })

  it('returns a review card with real dates after the trip over the wire', async () => {
    const store = new SupabaseProgressStore(memoryGateway())
    const card = schedule(null, 'good', new Date('2026-11-04T10:00:00Z'))
    const next = schedule(card, 'good', new Date('2026-11-05T10:00:00Z'))

    await store.saveReview('italian-game', 'a', next)

    const loaded = (await store.reviewCards('italian-game')).get('a')
    expect(loaded).toEqual(next)
    expect(loaded!.due).toBeInstanceOf(Date)
    expect(loaded!.last_review).toBeInstanceOf(Date)
  })

  it('replaces an earlier review card', async () => {
    const store = new SupabaseProgressStore(memoryGateway())
    const first = schedule(null, 'again', new Date('2026-11-04T10:00:00Z'))
    const second = schedule(first, 'good', new Date('2026-11-04T10:05:00Z'))
    await store.saveReview('c', 'a', first)
    await store.saveReview('c', 'a', second)
    expect((await store.reviewCards('c')).get('a')).toEqual(second)
  })

  it('lists drill results newest first', async () => {
    const store = new SupabaseProgressStore(memoryGateway())
    await store.addDrillResult('c', result, 1000)
    await store.addDrillResult('c', { ...result, passed: 9 }, 3000)
    await store.addDrillResult('c', { ...result, passed: 5 }, 2000)
    expect((await store.drillResults('c')).map((d) => d.at)).toEqual([3000, 2000, 1000])
    expect((await store.drillResults('c'))[0]).toEqual({ ...result, passed: 9, at: 3000 })
  })

  it('resets one course and leaves the others', async () => {
    const store = new SupabaseProgressStore(memoryGateway())
    const card = schedule(null, 'good', new Date('2026-11-04T10:00:00Z'))
    for (const course of ['c1', 'c2']) {
      await store.markLearned(course, 'a')
      await store.saveReview(course, 'a', card)
      await store.addDrillResult(course, result, 1)
    }

    await store.reset('c1')

    expect((await store.learnedLines('c1')).size).toBe(0)
    expect((await store.reviewCards('c1')).size).toBe(0)
    expect(await store.drillResults('c1')).toEqual([])
    expect((await store.learnedLines('c2')).size).toBe(1)
    expect((await store.reviewCards('c2')).size).toBe(1)
    expect(await store.drillResults('c2')).toHaveLength(1)
  })

  it('records active days once each and lists them in order', async () => {
    const store = new SupabaseProgressStore(memoryGateway())
    expect(await store.activityDays()).toEqual([])
    await store.recordActivity('2026-11-05')
    await store.recordActivity('2026-11-03')
    await store.recordActivity('2026-11-05')
    expect(await store.activityDays()).toEqual(['2026-11-03', '2026-11-05'])
  })

  it('keeps active days when a course is reset', async () => {
    const store = new SupabaseProgressStore(memoryGateway())
    await store.recordActivity('2026-11-05')
    await store.reset('c')
    expect(await store.activityDays()).toEqual(['2026-11-05'])
  })
})
