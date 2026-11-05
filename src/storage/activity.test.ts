import { describe, expect, it } from 'vitest'
import { schedule } from '../domain/learn/review'
import { onActivityRecorded, withActivity } from './activity'
import type { ProgressStore } from './progress'

const NOW = new Date(2026, 10, 5, 23, 30)
const card = schedule(null, 'good', NOW)
const drill = { passed: 3, failed: 1, durationMs: 60000, elapsedMs: 42000 }

function fakeStore(options: { failActivity?: boolean } = {}) {
  const log: string[] = []
  const store: ProgressStore = {
    async markLearned(c, l) {
      log.push(`learned:${c}:${l}`)
    },
    async learnedLines() {
      return new Set(['a'])
    },
    async learnedCounts() {
      return new Map([['c', 1]])
    },
    async reset() {},
    async reviewCards() {
      return new Map()
    },
    async saveReview(c, l) {
      log.push(`review:${c}:${l}`)
    },
    async addDrillResult(c) {
      log.push(`drill:${c}`)
    },
    async drillResults() {
      return []
    },
    async recordActivity(day) {
      if (options.failActivity) throw new Error('offline')
      log.push(`activity:${day}`)
    },
    async activityDays() {
      return ['2026-11-01']
    },
  }
  return { store, log }
}

describe('withActivity', () => {
  it('records today after a line is learned', async () => {
    const { store, log } = fakeStore()
    await withActivity(store, () => NOW).markLearned('c', 'a')
    expect(log).toEqual(['learned:c:a', 'activity:2026-11-05'])
  })

  it('records today after a review and after a drill', async () => {
    const { store, log } = fakeStore()
    const wrapped = withActivity(store, () => NOW)
    await wrapped.saveReview('c', 'a', card)
    await wrapped.addDrillResult('c', drill, 1000)
    expect(log).toEqual(['review:c:a', 'activity:2026-11-05', 'drill:c', 'activity:2026-11-05'])
  })

  it('uses the learner local date, not UTC', async () => {
    const { store, log } = fakeStore()
    // 00:30 local time on 6 November, whatever the time zone.
    await withActivity(store, () => new Date(2026, 10, 6, 0, 30)).markLearned('c', 'a')
    expect(log.at(-1)).toBe('activity:2026-11-06')
  })

  it('still saves the progress when recording the day fails', async () => {
    const { store, log } = fakeStore({ failActivity: true })
    await expect(withActivity(store, () => NOW).markLearned('c', 'a')).resolves.toBeUndefined()
    expect(log).toEqual(['learned:c:a'])
  })

  it('passes reads through and does not record on them', async () => {
    const { store, log } = fakeStore()
    const wrapped = withActivity(store, () => NOW)
    expect([...(await wrapped.learnedLines('c'))]).toEqual(['a'])
    expect(await wrapped.activityDays()).toEqual(['2026-11-01'])
    expect(log).toEqual([])
  })

  it('tells listeners after a day is recorded, until they unsubscribe', async () => {
    const { store } = fakeStore()
    const wrapped = withActivity(store, () => NOW)
    let calls = 0
    const stop = onActivityRecorded(() => calls++)
    await wrapped.markLearned('c', 'a')
    expect(calls).toBe(1)
    stop()
    await wrapped.markLearned('c', 'b')
    expect(calls).toBe(1)
  })

  it('does not tell listeners when recording the day failed', async () => {
    const { store } = fakeStore({ failActivity: true })
    let calls = 0
    const stop = onActivityRecorded(() => calls++)
    await withActivity(store, () => NOW).markLearned('c', 'a')
    stop()
    expect(calls).toBe(0)
  })
})
