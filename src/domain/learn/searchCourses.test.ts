import { describe, expect, it } from 'vitest'
import library from '../../data/openings.json'
import type { OpeningLine } from '../openings/types'
import { coursesFrom } from './courses'
import { searchCourses, searchCoursesByMoves } from './searchCourses'

const families = coursesFrom(library as OpeningLine[])
const names = (query: string) => searchCourses(families, query).map((c) => c.name)

describe('searchCourses', () => {
  it('lists every family when the query is empty', () => {
    expect(searchCourses(families, '   ')).toEqual(families)
  })

  it('finds a family by name, ignoring case', () => {
    expect(names('italian')).toContain('Italian Game')
    expect(names('ITALIAN')).toContain('Italian Game')
  })

  it('finds a family by ECO code', () => {
    expect(names('c50')).toContain('Italian Game')
  })

  it('finds a variation that has its own course', () => {
    expect(names('najdorf')).toEqual(['Sicilian Defense: Najdorf Variation'])
  })

  it('finds a variation when the family name is part of the query', () => {
    expect(names('sicilian dragon')).toContain('Sicilian Defense: Dragon Variation')
    expect(names('sicilian dragon')).not.toContain('Sicilian Defense')
  })

  it('shows only the family, not its variations, when the query names just the family', () => {
    const result = names('sicilian')
    expect(result).toContain('Sicilian Defense')
    expect(result.filter((n) => n.startsWith('Sicilian Defense: '))).toEqual([])
  })

  it('needs every word of the query to match', () => {
    expect(names('italian zzzz')).toEqual([])
  })

  it('does not change the families list it was given', () => {
    const before = families.length
    searchCourses(families, 'najdorf')
    expect(families).toHaveLength(before)
  })
})

describe('searchCoursesByMoves', () => {
  const byMoves = (moves: string) => searchCoursesByMoves(families, moves).map((c) => c.name)

  it('returns every family for an empty query', () => {
    expect(searchCoursesByMoves(families, '  ')).toEqual(families)
  })

  it('finds a course whose line starts with the moves, numbered or not', () => {
    expect(byMoves('1.e4 e5 2.Nf3')).toContain('The Italian Game')
    expect(byMoves('e4 e5 Nf3')).toContain('The Italian Game')
  })

  it('does not match moves that appear only later in a line', () => {
    expect(byMoves('1.Bc4')).not.toContain('The Italian Game')
  })

  it('returns nothing when the first move is by the wrong colour', () => {
    expect(byMoves('e5')).toEqual([])
  })

  it('returns nothing for a sequence longer than every line', () => {
    expect(byMoves('e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 d5 e5 e4 zz')).toEqual([])
  })
})
