import { describe, expect, it } from 'vitest'
import type { Course, CourseLine } from './courses'
import { courseProgress, nextLine } from './nextLine'

function courseOf(...plies: number[]): Course {
  const lines: CourseLine[] = plies.map((p, i) => ({
    key: `k${i}`,
    plies: p,
    line: { eco: 'C50', name: `Line ${i}`, pgn: '' },
  }))
  return { id: 'x', name: 'X', lines, ecoFrom: 'C50', ecoTo: 'C50' }
}

describe('nextLine', () => {
  const course = courseOf(9, 3, 13)

  it('returns the shortest unlearned line within the depth', () => {
    expect(nextLine(course, 'full', 'white', new Set())?.key).toBe('k1')
  })

  it('skips learned lines', () => {
    expect(nextLine(course, 'full', 'white', new Set(['k1']))?.key).toBe('k0')
  })

  it('ignores lines outside the depth', () => {
    expect(nextLine(course, 'essentials', 'white', new Set(['k1']))).toBeNull()
  })

  it('returns null when every line is learned', () => {
    expect(nextLine(course, 'full', 'white', new Set(['k0', 'k1', 'k2']))).toBeNull()
  })
})

describe('courseProgress', () => {
  it('counts only lines inside the depth and side', () => {
    const course = courseOf(1, 3, 8, 12, 6)
    expect(courseProgress(course, 'advanced', 'black', new Set(['k2', 'k3']))).toEqual({
      done: 1,
      total: 2,
    })
  })
})
