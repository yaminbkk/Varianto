import { describe, expect, it } from 'vitest'
import library from '../../data/openings.json'
import type { OpeningLine } from '../openings/types'
import { coursesFrom, type Course } from './courses'
import { progressId, resolveCourse, variantCourses, variationName } from './variants'

function lines(...entries: [string, string][]): OpeningLine[] {
  return entries.map(([name, pgn]) => ({ eco: 'B90', name, pgn }))
}

describe('variationName', () => {
  it('takes the text after the first colon up to the next comma or colon', () => {
    expect(variationName('Sicilian Defense: Najdorf Variation, English Attack')).toBe(
      'Najdorf Variation',
    )
    expect(variationName('Sicilian Defense: Open: Najdorf')).toBe('Open')
  })

  it('has none for a name without a colon', () => {
    expect(variationName('Sicilian Defense')).toBeNull()
  })
})

describe('variantCourses', () => {
  const najdorf = (n: number) =>
    [
      'Sicilian Defense: Najdorf Variation',
      `1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 ${n}`,
    ] as [string, string]
  const dragon = (n: number) =>
    [
      'Sicilian Defense: Dragon Variation',
      `1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 g6 ${n}`,
    ] as [string, string]
  const family = coursesFrom(
    lines(
      ['Sicilian Defense', '1. e4 c5'],
      najdorf(1),
      najdorf(2),
      najdorf(3),
      dragon(1),
      dragon(2),
      dragon(3),
      dragon(4),
      ['Sicilian Defense: Alapin Variation', '1. e4 c5 2. c3'],
    ),
  )[0] as Course

  it('makes a course of its own for each variation with at least three lines, biggest first', () => {
    const variants = variantCourses(family)
    expect(variants.map((v) => v.name)).toEqual([
      'Sicilian Defense: Dragon Variation',
      'Sicilian Defense: Najdorf Variation',
    ])
    expect(variants.map((v) => v.lines.length)).toEqual([4, 3])
  })

  it('links each variant back to its family and gives it a unique id', () => {
    const [dragonCourse] = variantCourses(family)
    expect(dragonCourse?.parentId).toBe(family.id)
    expect(dragonCourse?.id).toBe('sicilian-defense--dragon-variation')
  })

  it('has no variants when fewer than two variations are big enough', () => {
    const small = coursesFrom(lines(['Sicilian Defense', '1. e4 c5'], najdorf(1)))[0] as Course
    expect(variantCourses(small)).toEqual([])
  })
})

describe('resolveCourse and progressId', () => {
  const all = coursesFrom(library as OpeningLine[])

  it('finds a family by id and a variant by its own id', () => {
    const sicilian = resolveCourse(all, 'sicilian-defense')
    expect(sicilian?.name).toBe('Sicilian Defense')
    const najdorf = resolveCourse(all, 'sicilian-defense--najdorf-variation')
    expect(najdorf?.name).toBe('Sicilian Defense: Najdorf Variation')
    expect(najdorf?.lines.length).toBeGreaterThan(10)
    expect(resolveCourse(all, 'nope')).toBeUndefined()
    expect(resolveCourse(all, 'sicilian-defense--nope')).toBeUndefined()
  })

  it('records progress under the family so a line is learned once', () => {
    const najdorf = resolveCourse(all, 'sicilian-defense--najdorf-variation') as Course
    expect(progressId(najdorf)).toBe('sicilian-defense')
    expect(progressId(all[0] as Course)).toBe((all[0] as Course).id)
  })

  it('keeps every variant line inside its family', () => {
    for (const family of all) {
      const keys = new Set(family.lines.map((l) => l.key))
      for (const variant of variantCourses(family)) {
        expect(variant.lines.every((l) => keys.has(l.key))).toBe(true)
      }
    }
  })
})
