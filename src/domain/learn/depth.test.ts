import { describe, expect, it } from 'vitest'
import type { Course, CourseLine } from './courses'
import { depthChoices, linesFor, lineOwner } from './depth'

function courseOf(...plies: number[]): Course {
  const lines: CourseLine[] = plies.map((p, i) => ({
    key: `k${i}`,
    plies: p,
    line: { eco: 'C50', name: `Line ${i}`, pgn: '' },
  }))
  return { id: 'x', name: 'X', lines, ecoFrom: 'C50', ecoTo: 'C50' }
}

describe('lineOwner', () => {
  it('belongs to the side that played the last move', () => {
    expect(lineOwner(1)).toBe('white')
    expect(lineOwner(2)).toBe('black')
    expect(lineOwner(5)).toBe('white')
    expect(lineOwner(6)).toBe('black')
  })
})

describe('linesFor', () => {
  // White owns the odd lengths (3, 7, 11), Black the even ones (8, 12).
  const course = courseOf(12, 3, 8, 11, 7)

  it('keeps only the learner side lines, filtered by depth and ordered by length', () => {
    expect(linesFor(course, 'essentials', 'white').map((l) => l.plies)).toEqual([3, 7])
    expect(linesFor(course, 'advanced', 'white').map((l) => l.plies)).toEqual([3, 7, 11])
    expect(linesFor(course, 'full', 'white').map((l) => l.plies)).toEqual([3, 7, 11])
    expect(linesFor(course, 'essentials', 'black').map((l) => l.plies)).toEqual([])
    expect(linesFor(course, 'advanced', 'black').map((l) => l.plies)).toEqual([8])
    expect(linesFor(course, 'full', 'black').map((l) => l.plies)).toEqual([8, 12])
  })

  it('leaves out a Black deviation when learning as White', () => {
    // Like "Italian Game: Paris Defense": five plies of the main line, then Black's ...d6.
    const c = courseOf(5, 6)
    expect(linesFor(c, 'full', 'white').map((l) => l.plies)).toEqual([5])
    expect(linesFor(c, 'full', 'black').map((l) => l.plies)).toEqual([6])
  })

  it('has nothing for Black in a one-ply line', () => {
    expect(linesFor(courseOf(1), 'full', 'black')).toEqual([])
  })

  it('keeps library order for lines of equal length', () => {
    const c = courseOf(5, 5, 5)
    expect(linesFor(c, 'full', 'white').map((l) => l.key)).toEqual(['k0', 'k1', 'k2'])
  })
})

describe('depthChoices', () => {
  it('offers every level when each adds lines', () => {
    expect(depthChoices(courseOf(3, 9, 13), 'white')).toEqual(['essentials', 'advanced', 'full'])
  })

  it('collapses to full when all levels hold the same lines', () => {
    expect(depthChoices(courseOf(5, 5), 'white')).toEqual(['full'])
    expect(depthChoices(courseOf(5), 'white')).toEqual(['full'])
  })

  it('skips levels that add nothing', () => {
    expect(depthChoices(courseOf(3, 13), 'white')).toEqual(['essentials', 'full'])
  })

  it('is empty when the learner has no lines', () => {
    expect(depthChoices(courseOf(1), 'black')).toEqual([])
    expect(depthChoices(courseOf(5, 6), 'white')).toEqual(['full'])
  })
})
