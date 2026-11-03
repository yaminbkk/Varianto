import { describe, expect, it } from 'vitest'
import { dueKeys, gradeFor, schedule, type ReviewCard } from './review'

const now = new Date('2026-11-03T12:00:00Z')

describe('gradeFor', () => {
  it('is good for a clean run', () => {
    expect(gradeFor({ mistakes: 0, hinted: false, solved: false })).toBe('good')
  })

  it('is hard when a hint was used without mistakes', () => {
    expect(gradeFor({ mistakes: 0, hinted: true, solved: false })).toBe('hard')
  })

  it('is again after a mistake', () => {
    expect(gradeFor({ mistakes: 1, hinted: false, solved: false })).toBe('again')
  })

  it('is again when Solve was used', () => {
    expect(gradeFor({ mistakes: 0, hinted: false, solved: true })).toBe('again')
  })
})

describe('schedule', () => {
  it('schedules a new card in the future after a good review', () => {
    const card = schedule(null, 'good', now)
    expect(card.due.getTime()).toBeGreaterThan(now.getTime())
  })

  it('brings a failed card back sooner than a good one', () => {
    const again = schedule(null, 'again', now)
    const good = schedule(null, 'good', now)
    expect(again.due.getTime()).toBeLessThan(good.due.getTime())
  })

  it('does not change the card it was given', () => {
    const card = schedule(null, 'good', now)
    const before = JSON.stringify(card)
    schedule(card, 'again', new Date(now.getTime() + 86_400_000))
    expect(JSON.stringify(card)).toBe(before)
  })
})

describe('dueKeys', () => {
  const future: ReviewCard = schedule(null, 'good', new Date(now.getTime() + 30 * 86_400_000))
  const overdue: ReviewCard = schedule(null, 'good', new Date(now.getTime() - 30 * 86_400_000))

  it('treats a learned line with no card as due', () => {
    expect(dueKeys(new Map(), new Set(['a']), now)).toEqual(['a'])
  })

  it('skips lines whose card is not due yet', () => {
    expect(dueKeys(new Map([['a', future]]), new Set(['a']), now)).toEqual([])
  })

  it('includes overdue lines', () => {
    expect(dueKeys(new Map([['a', overdue]]), new Set(['a']), now)).toEqual(['a'])
  })

  it('ignores lines that are not learned', () => {
    expect(dueKeys(new Map([['a', overdue]]), new Set(), now)).toEqual([])
  })

  it('lists lines with no history first, then the earliest due', () => {
    const older = schedule(null, 'good', new Date(now.getTime() - 60 * 86_400_000))
    const cards = new Map([
      ['late', overdue],
      ['early', older],
    ])
    expect(dueKeys(cards, new Set(['late', 'early', 'fresh']), now)).toEqual([
      'fresh',
      'early',
      'late',
    ])
  })
})
