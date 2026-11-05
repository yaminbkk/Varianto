import { describe, expect, it } from 'vitest'
import { localDay, streakInfo } from './streak'

describe('localDay', () => {
  it('formats the local calendar date with zero padding', () => {
    expect(localDay(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
    expect(localDay(new Date(2026, 10, 5, 0, 1))).toBe('2026-11-05')
  })
})

describe('streakInfo', () => {
  it('is empty without activity', () => {
    expect(streakInfo([], '2026-11-05')).toEqual({ current: 0, longest: 0, activeToday: false })
  })

  it('counts today alone as a streak of one', () => {
    expect(streakInfo(['2026-11-05'], '2026-11-05')).toEqual({
      current: 1,
      longest: 1,
      activeToday: true,
    })
  })

  it('keeps the streak alive when yesterday was the last active day', () => {
    expect(streakInfo(['2026-11-03', '2026-11-04'], '2026-11-05')).toEqual({
      current: 2,
      longest: 2,
      activeToday: false,
    })
  })

  it('resets the current streak after a missed day but remembers the longest', () => {
    const days = ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-05']
    expect(streakInfo(days, '2026-11-05')).toEqual({ current: 1, longest: 3, activeToday: true })
    expect(streakInfo(['2026-11-01', '2026-11-02', '2026-11-03'], '2026-11-05')).toEqual({
      current: 0,
      longest: 3,
      activeToday: false,
    })
  })

  it('ignores duplicates and order', () => {
    const days = ['2026-11-05', '2026-11-03', '2026-11-04', '2026-11-04', '2026-11-05']
    expect(streakInfo(days, '2026-11-05')).toEqual({ current: 3, longest: 3, activeToday: true })
  })

  it('counts across month and year boundaries', () => {
    expect(streakInfo(['2026-02-28', '2026-03-01'], '2026-03-01').current).toBe(2)
    expect(streakInfo(['2025-12-31', '2026-01-01'], '2026-01-01').current).toBe(2)
    expect(streakInfo(['2028-02-28', '2028-02-29', '2028-03-01'], '2028-03-01').current).toBe(3)
  })
})
