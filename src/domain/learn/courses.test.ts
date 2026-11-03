import { describe, expect, it } from 'vitest'
import library from '../../data/openings.json'
import type { OpeningLine } from '../openings/types'
import { courseName, coursesFrom } from './courses'

const fixture: OpeningLine[] = [
  { eco: 'C50', name: 'Italian Game', pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4' },
  {
    eco: 'C54',
    name: 'Italian Game: Classical Variation',
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3',
  },
  { eco: 'C00', name: 'French Defense', pgn: '1. e4 e6' },
]

describe('courseName', () => {
  it('takes the text before the first colon', () => {
    expect(courseName('Italian Game: Giuoco Piano')).toBe('Italian Game')
  })

  it('keeps a name without a colon', () => {
    expect(courseName('Zukertort Opening')).toBe('Zukertort Opening')
  })
})

describe('coursesFrom', () => {
  it('groups lines into courses sorted by name', () => {
    const courses = coursesFrom(fixture)
    expect(courses.map((c) => c.id)).toEqual(['french-defense', 'italian-game'])
    const italian = courses[1]
    expect(italian?.lines).toHaveLength(2)
    expect(new Set(italian?.lines.map((l) => l.key)).size).toBe(2)
    expect(italian?.ecoFrom).toBe('C50')
    expect(italian?.ecoTo).toBe('C54')
    expect(italian?.lines.map((l) => l.plies)).toEqual([5, 8])
  })

  it('covers the whole real library', () => {
    const courses = coursesFrom(library as OpeningLine[])
    expect(courses).toHaveLength(150)
    expect(new Set(courses.map((c) => c.id)).size).toBe(150)
    expect(courses.reduce((n, c) => n + c.lines.length, 0)).toBe(library.length)
    expect(courses.find((c) => c.name === 'Italian Game')?.lines).toHaveLength(187)
  })
})
