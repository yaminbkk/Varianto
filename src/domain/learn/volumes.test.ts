import { describe, expect, it } from 'vitest'
import type { Course, CourseLine } from './courses'
import { groupByVolume, inProgress } from './volumes'

function course(name: string, eco: string, lineCount: number, id = name.toLowerCase()): Course {
  const lines = Array.from({ length: lineCount }, (_, i) => ({ key: `${id}-${i}` }) as CourseLine)
  return { id, name, lines, ecoFrom: eco, ecoTo: eco }
}

describe('groupByVolume', () => {
  it('groups courses by the ECO letter of their first code, in volume order A to E', () => {
    const groups = groupByVolume([
      course('Nimzo', 'E20', 5),
      course('Sicilian', 'B20', 5),
      course('Reti', 'A04', 5),
    ])
    expect(groups.map((g) => g.volume)).toEqual(['A', 'B', 'E'])
  })

  it('sorts a volume by line count, deepest first, then by name', () => {
    const [group] = groupByVolume([
      course('Scotch Game', 'C44', 10),
      course('Ruy Lopez', 'C60', 40),
      course('Bishop', 'C23', 10),
    ])
    expect(group?.courses.map((c) => c.name)).toEqual(['Ruy Lopez', 'Bishop', 'Scotch Game'])
  })

  it('labels each volume with its family name', () => {
    const [group] = groupByVolume([course('Reti', 'A04', 1)])
    expect(group?.label).toBe('Flank openings (A)')
  })

  it('omits volumes with no courses and puts unknown codes last as Other', () => {
    const groups = groupByVolume([course('Odd', 'Z99', 1), course('Reti', 'A04', 1)])
    expect(groups.map((g) => g.volume)).toEqual(['A', 'Other'])
  })

  it('returns nothing for no courses and does not mutate its input', () => {
    expect(groupByVolume([])).toEqual([])
    const input = Object.freeze([course('B', 'B01', 1), course('A', 'A01', 1)]) as readonly Course[]
    groupByVolume(input)
    expect(input.map((c) => c.name)).toEqual(['B', 'A'])
  })
})

describe('inProgress', () => {
  const courses = [
    course('Italian', 'C50', 10),
    course('Ruy Lopez', 'C60', 10),
    course('Scotch', 'C44', 10),
    course('Vienna', 'C25', 10),
  ]

  it('lists courses that are started but not finished, most learned first', () => {
    const counts = new Map([
      ['italian', 2],
      ['ruy lopez', 7],
      ['scotch', 0],
      ['vienna', 10],
    ])
    expect(inProgress(courses, counts).map((c) => c.name)).toEqual(['Ruy Lopez', 'Italian'])
  })

  it('limits the result and ignores variant courses, whose progress sits on their parent', () => {
    const variant: Course = { ...course('Italian Variant', 'C50', 10), parentId: 'italian' }
    const counts = new Map([
      ['italian', 1],
      ['ruy lopez', 2],
      ['scotch', 3],
      ['vienna', 4],
      ['italian variant', 5],
    ])
    const result = inProgress([...courses, variant], counts, 2)
    expect(result.map((c) => c.name)).toEqual(['Vienna', 'Scotch'])
  })

  it('returns an empty list when nothing is in progress', () => {
    expect(inProgress(courses, new Map())).toEqual([])
  })
})
