import { describe, expect, it } from 'vitest'
import library from '../../data/openings.json'
import hidden from '../../data/hidden-courses.json'
import type { OpeningLine } from '../openings/types'
import { coursesFrom, type Course } from './courses'
import { visibleCourses } from './visibleCourses'

function course(name: string): Course {
  return { id: name.toLowerCase(), name, lines: [], ecoFrom: 'A00', ecoTo: 'A00' }
}

describe('visibleCourses', () => {
  it('leaves out courses whose name is in the hidden list', () => {
    const courses = [course('Italian Game'), course('Creepy Crawly Formation'), course('Ruy Lopez')]
    expect(visibleCourses(courses, ['Creepy Crawly Formation']).map((c) => c.name)).toEqual([
      'Italian Game',
      'Ruy Lopez',
    ])
  })

  it('returns every course when nothing is hidden', () => {
    const courses = [course('A'), course('B')]
    expect(visibleCourses(courses, [])).toEqual(courses)
  })

  it('does not change the order and does not mutate its input', () => {
    const courses = Object.freeze([course('B'), course('A')]) as readonly Course[]
    expect(visibleCourses(courses, ['C']).map((c) => c.name)).toEqual(['B', 'A'])
  })
})

describe('the shipped hidden list', () => {
  const all = coursesFrom(library as OpeningLine[])
  const names = new Set(all.map((c) => c.name))

  it('names only courses that exist in the library', () => {
    expect((hidden as string[]).filter((n) => !names.has(n))).toEqual([])
  })

  it('keeps the well-known openings visible', () => {
    const shown = visibleCourses(all, hidden as string[]).map((c) => c.name)
    for (const name of [
      'Italian Game',
      'Ruy Lopez',
      'Sicilian Defense',
      'French Defense',
      "Queen's Gambit",
    ]) {
      expect(shown).toContain(name)
    }
  })
})
