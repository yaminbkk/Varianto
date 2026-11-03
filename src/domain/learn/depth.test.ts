import { describe, expect, it } from 'vitest'
import type { Course, CourseLine } from './courses'
import { depthChoices, learnerMoves, linesFor } from './depth'

function courseOf(...plies: number[]): Course {
  const lines: CourseLine[] = plies.map((p, i) => ({
    key: `k${i}`,
    plies: p,
    line: { eco: 'C50', name: `Line ${i}`, pgn: '' },
  }))
  return { id: 'x', name: 'X', lines, ecoFrom: 'C50', ecoTo: 'C50' }
}

describe('learnerMoves', () => {
  it('counts the plies the learner plays', () => {
    expect(learnerMoves(5, 'white')).toBe(3)
    expect(learnerMoves(5, 'black')).toBe(2)
    expect(learnerMoves(1, 'black')).toBe(0)
    expect(learnerMoves(1, 'white')).toBe(1)
  })
})

describe('linesFor', () => {
  const course = courseOf(12, 3, 8, 11, 7)

  it('filters by depth and orders by length', () => {
    expect(linesFor(course, 'essentials', 'white').map((l) => l.plies)).toEqual([3, 7])
    expect(linesFor(course, 'advanced', 'white').map((l) => l.plies)).toEqual([3, 7, 8, 11])
    expect(linesFor(course, 'full', 'white').map((l) => l.plies)).toEqual([3, 7, 8, 11, 12])
  })

  it('excludes lines where the learner has no move', () => {
    const c = courseOf(1, 2)
    expect(linesFor(c, 'full', 'black').map((l) => l.plies)).toEqual([2])
    expect(linesFor(c, 'full', 'white').map((l) => l.plies)).toEqual([1, 2])
  })

  it('keeps library order for lines of equal length', () => {
    const c = courseOf(5, 5, 5)
    expect(linesFor(c, 'full', 'white').map((l) => l.key)).toEqual(['k0', 'k1', 'k2'])
  })
})

describe('depthChoices', () => {
  it('offers every level when each adds lines', () => {
    expect(depthChoices(courseOf(3, 8, 12), 'white')).toEqual(['essentials', 'advanced', 'full'])
  })

  it('collapses to full when all levels hold the same lines', () => {
    expect(depthChoices(courseOf(4, 4), 'white')).toEqual(['full'])
    expect(depthChoices(courseOf(4), 'white')).toEqual(['full'])
  })

  it('skips levels that add nothing', () => {
    expect(depthChoices(courseOf(3, 12), 'white')).toEqual(['essentials', 'full'])
  })

  it('is empty when the learner has no lines', () => {
    expect(depthChoices(courseOf(1), 'black')).toEqual([])
  })
})
