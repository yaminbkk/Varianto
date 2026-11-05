import { describe, expect, it } from 'vitest'
import { streakText } from './streakText'

describe('streakText', () => {
  it('says when today is done', () => {
    expect(streakText({ current: 3, longest: 5, activeToday: true })).toBe(
      '3-day streak, done today',
    )
  })

  it('asks the learner to practise when only yesterday counted', () => {
    expect(streakText({ current: 3, longest: 5, activeToday: false })).toBe(
      '3-day streak, practise today to keep it',
    )
  })
})
