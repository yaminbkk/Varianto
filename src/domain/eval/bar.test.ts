import { describe, expect, it } from 'vitest'
import { barFill, describeEvaluation, evalLabel } from './bar'
import type { Evaluation } from './types'

const cp = (value: number): Evaluation => ({ kind: 'cp', value, depth: 14 })
const mate = (value: number): Evaluation => ({ kind: 'mate', value, depth: 14 })
const final = (result: 'white' | 'black' | 'draw'): Evaluation => ({ kind: 'final', result })

describe('barFill', () => {
  it('is half for an equal position', () => {
    expect(barFill(cp(0))).toBe(0.5)
  })

  it('follows the win-percentage curve for centipawns', () => {
    expect(barFill(cp(100))).toBeCloseTo(0.591, 2)
    expect(barFill(cp(-100))).toBeCloseTo(1 - barFill(cp(100)), 10)
  })

  it('stays inside the bar for huge scores', () => {
    expect(barFill(cp(10000))).toBeGreaterThan(0.99)
    expect(barFill(cp(10000))).toBeLessThanOrEqual(1)
  })

  it('fills completely for the side that mates', () => {
    expect(barFill(mate(3))).toBe(1)
    expect(barFill(mate(-3))).toBe(0)
  })

  it('reflects finished games', () => {
    expect(barFill(final('white'))).toBe(1)
    expect(barFill(final('black'))).toBe(0)
    expect(barFill(final('draw'))).toBe(0.5)
  })
})

describe('evalLabel', () => {
  it('shows pawns with one decimal and a sign', () => {
    expect(evalLabel(cp(34))).toBe('+0.3')
    expect(evalLabel(cp(-120))).toBe('-1.2')
  })

  it('shows no sign when the score rounds to zero', () => {
    expect(evalLabel(cp(0))).toBe('0.0')
    expect(evalLabel(cp(4))).toBe('0.0')
    expect(evalLabel(cp(-4))).toBe('0.0')
  })

  it('shows mates', () => {
    expect(evalLabel(mate(3))).toBe('M3')
    expect(evalLabel(mate(-2))).toBe('-M2')
  })

  it('shows finished games', () => {
    expect(evalLabel(final('white'))).toBe('1-0')
    expect(evalLabel(final('black'))).toBe('0-1')
    expect(evalLabel(final('draw'))).toBe('0.0')
  })
})

describe('describeEvaluation', () => {
  it('words centipawn scores', () => {
    expect(describeEvaluation(cp(34))).toBe('Evaluation: White is ahead (+0.3)')
    expect(describeEvaluation(cp(-120))).toBe('Evaluation: Black is ahead (-1.2)')
    expect(describeEvaluation(cp(0))).toBe('Evaluation: equal (0.0)')
  })

  it('words mates and finished games', () => {
    expect(describeEvaluation(mate(3))).toBe('Evaluation: White mates in 3')
    expect(describeEvaluation(mate(-2))).toBe('Evaluation: Black mates in 2')
    expect(describeEvaluation(final('white'))).toBe('Evaluation: White won by checkmate')
    expect(describeEvaluation(final('black'))).toBe('Evaluation: Black won by checkmate')
    expect(describeEvaluation(final('draw'))).toBe('Evaluation: drawn')
  })
})
