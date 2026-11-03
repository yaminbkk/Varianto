import { describe, expect, it } from 'vitest'
import library from '../../data/openings.json'
import hidden from '../../data/hidden-courses.json'
import type { OpeningLine } from '../openings/types'
import { coursesFrom, type Course } from './courses'
import { CATEGORIES, firstMove, inCategory } from './categories'
import { visibleCourses } from './visibleCourses'

function courseOf(name: string, pgn: string): Course {
  const plies = pgn.split(/\s+/).filter((t) => !/^\d+\./.test(t)).length
  return {
    id: name,
    name,
    ecoFrom: 'A00',
    ecoTo: 'A00',
    lines: [{ key: 'k', plies, line: { eco: 'A00', name, pgn } }],
  }
}

const italian = courseOf('Italian Game', '1. e4 e5 2. Nf3 Nc6 3. Bc4')
const sicilian = courseOf('Sicilian Defense', '1. e4 c5')
const queens = courseOf("Queen's Gambit", '1. d4 d5 2. c4')
const indian = courseOf(
  "King's Indian Defense",
  '1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4 d6 5. Nf3 O-O 6. Be2 e5',
)
const english = courseOf('English Opening', '1. c4')
const reti = courseOf('Reti Opening', '1. Nf3 d5')

describe('firstMove', () => {
  it('is the first move of the main line', () => {
    expect(firstMove(italian)).toBe('e4')
    expect(firstMove(queens)).toBe('d4')
    expect(firstMove(reti)).toBe('Nf3')
  })
})

describe('inCategory', () => {
  it('lists the categories in display order', () => {
    expect(CATEGORIES).toEqual(['white', 'black', 'e4', 'd4', 'others'])
  })

  it('puts an opening White plays under White and a defence under Black', () => {
    expect(inCategory(italian, 'white')).toBe(true)
    expect(inCategory(italian, 'black')).toBe(false)
    expect(inCategory(sicilian, 'black')).toBe(true)
    expect(inCategory(sicilian, 'white')).toBe(false)
  })

  it('groups by the first move', () => {
    expect(inCategory(italian, 'e4')).toBe(true)
    expect(inCategory(sicilian, 'e4')).toBe(true)
    expect(inCategory(queens, 'd4')).toBe(true)
    expect(inCategory(indian, 'd4')).toBe(true)
    expect(inCategory(italian, 'd4')).toBe(false)
  })

  it('keeps every other first move under Others', () => {
    expect(inCategory(english, 'others')).toBe(true)
    expect(inCategory(reti, 'others')).toBe(true)
    expect(inCategory(italian, 'others')).toBe(false)
    expect(inCategory(queens, 'others')).toBe(false)
  })
})

describe('the real library', () => {
  const courses = visibleCourses(coursesFrom(library as OpeningLine[]), hidden as string[])

  it('has openings in every category', () => {
    for (const category of CATEGORIES) {
      expect(courses.filter((c) => inCategory(c, category)).length).toBeGreaterThan(0)
    }
  })

  it('puts every course under exactly one of E4, D4 and Others', () => {
    for (const course of courses) {
      const hits = (['e4', 'd4', 'others'] as const).filter((c) => inCategory(course, c))
      expect(hits).toHaveLength(1)
    }
  })

  it('puts every course under exactly one of White and Black', () => {
    for (const course of courses) {
      expect(inCategory(course, 'white')).not.toBe(inCategory(course, 'black'))
    }
  })
})
