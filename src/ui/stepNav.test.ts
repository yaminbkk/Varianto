import { describe, expect, it } from 'vitest'
import { stepBy } from './stepNav'

describe('stepBy', () => {
  it('moves forward and back within the range', () => {
    expect(stepBy(2, 1, 5)).toBe(3)
    expect(stepBy(2, -1, 5)).toBe(1)
  })

  it('stays at the start and the end', () => {
    expect(stepBy(0, -1, 5)).toBe(0)
    expect(stepBy(5, 1, 5)).toBe(5)
  })

  it('works for a one-move line', () => {
    expect(stepBy(0, 1, 1)).toBe(1)
    expect(stepBy(1, 1, 1)).toBe(1)
  })
})
