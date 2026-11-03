import { describe, expect, it } from 'vitest'
import {
  currentKey,
  DEFAULT_DRILL_MS,
  DRILL_DURATIONS_MS,
  drillResult,
  isOver,
  recordLine,
  startDrill,
  timeLeftMs,
} from './drill'

const identity = (keys: string[]) => keys

describe('drill', () => {
  it('offers 1, 3 and 5 minutes, with 3 as the default', () => {
    expect(DRILL_DURATIONS_MS).toEqual([60_000, 180_000, 300_000])
    expect(DEFAULT_DRILL_MS).toBe(180_000)
  })

  it('starts on the first line of the shuffled queue without changing the input', () => {
    const keys = ['a', 'b', 'c']
    const state = startDrill(keys, 60_000, 1000, (k) => [...k].reverse())
    expect(currentKey(state)).toBe('c')
    expect(keys).toEqual(['a', 'b', 'c'])
  })

  it('counts a passed line and moves on', () => {
    const state = recordLine(startDrill(['a', 'b'], 60_000, 0, identity), true)
    expect(state.passed).toBe(1)
    expect(state.failed).toBe(0)
    expect(currentKey(state)).toBe('b')
  })

  it('counts a failed line and moves on', () => {
    const state = recordLine(startDrill(['a', 'b'], 60_000, 0, identity), false)
    expect(state.failed).toBe(1)
    expect(currentKey(state)).toBe('b')
  })

  it('does not change the state it was given', () => {
    const state = startDrill(['a', 'b'], 60_000, 0, identity)
    recordLine(state, true)
    expect(state.passed).toBe(0)
    expect(state.index).toBe(0)
  })

  it('reports the time left, never below zero', () => {
    const state = startDrill(['a'], 60_000, 1000, identity)
    expect(timeLeftMs(state, 31_000)).toBe(30_000)
    expect(timeLeftMs(state, 999_000)).toBe(0)
  })

  it('is over when time runs out', () => {
    const state = startDrill(['a', 'b'], 60_000, 0, identity)
    expect(isOver(state, 59_999)).toBe(false)
    expect(isOver(state, 60_000)).toBe(true)
  })

  it('is over after the last line, even with time left', () => {
    const state = recordLine(startDrill(['a'], 60_000, 0, identity), true)
    expect(isOver(state, 1000)).toBe(true)
    expect(currentKey(state)).toBeNull()
  })

  it('is over at once when there are no lines', () => {
    expect(isOver(startDrill([], 60_000, 0, identity), 0)).toBe(true)
  })

  it('caps the elapsed time at the drill length', () => {
    const state = recordLine(startDrill(['a', 'b'], 60_000, 0, identity), true)
    expect(drillResult(state, 20_000)).toEqual({
      passed: 1,
      failed: 0,
      durationMs: 60_000,
      elapsedMs: 20_000,
    })
    expect(drillResult(state, 999_000).elapsedMs).toBe(60_000)
  })
})
