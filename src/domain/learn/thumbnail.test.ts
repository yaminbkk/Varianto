import { describe, expect, it } from 'vitest'
import library from '../../data/openings.json'
import type { OpeningLine } from '../openings/types'
import type { Course, CourseLine } from './courses'
import { coursesFrom } from './courses'
import { linesFor } from './depth'
import { courseThumbnail, naturalSide } from './thumbnail'

function courseOf(name: string, ...lines: { name: string; pgn: string; plies: number }[]): Course {
  const courseLines: CourseLine[] = lines.map((l, i) => ({
    key: `k${i}`,
    plies: l.plies,
    line: { eco: 'C50', name: l.name, pgn: l.pgn },
  }))
  return { id: 'x', name, lines: courseLines, ecoFrom: 'C50', ecoTo: 'C50' }
}

describe('courseThumbnail', () => {
  it('shows the position of the line that carries the course name', () => {
    const course = courseOf(
      'Italian Game',
      { name: 'Italian Game: Paris Defense', pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 d6', plies: 6 },
      { name: 'Italian Game', pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4', plies: 5 },
    )
    expect(courseThumbnail(course).fen).toBe(
      'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
    )
  })

  it('falls back to the shortest line when no line carries the course name', () => {
    const course = courseOf(
      'Sicilian Defense',
      { name: 'Sicilian Defense: Najdorf', pgn: '1. e4 c5 2. Nf3 d6', plies: 4 },
      { name: 'Sicilian Defense: Bowdler', pgn: '1. e4 c5', plies: 2 },
    )
    expect(courseThumbnail(course).fen).toBe(
      'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
    )
  })

  it('looks from the side that owns the shown line', () => {
    const white = courseOf('A', { name: 'A', pgn: '1. e4', plies: 1 })
    const black = courseOf('B', { name: 'B', pgn: '1. e4 c5', plies: 2 })
    expect(courseThumbnail(white).orientation).toBe('white')
    expect(courseThumbnail(black).orientation).toBe('black')
    // The line carrying the course name decides, not how many lines each side has.
    const defence = courseOf(
      'D',
      { name: 'D', pgn: '1. e4 c5', plies: 2 },
      { name: 'D: A', pgn: '1. e4 c5 2. Nf3', plies: 3 },
      { name: 'D: B', pgn: '1. e4 c5 2. c3', plies: 3 },
    )
    expect(courseThumbnail(defence).orientation).toBe('black')
  })

  it('has a position for every course of the real library', () => {
    for (const course of coursesFrom(library as OpeningLine[])) {
      expect(courseThumbnail(course).fen).toMatch(/^[^ ]+ [wb] /)
    }
  })
})

describe('naturalSide', () => {
  it('is White for an opening White plays and Black for a defence', () => {
    const italian = courseOf('Italian Game', {
      name: 'Italian Game',
      pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4',
      plies: 5,
    })
    const french = courseOf(
      'French Defense',
      { name: 'French Defense', pgn: '1. e4 e6', plies: 2 },
      { name: 'French Defense: Advance', pgn: '1. e4 e6 2. d4 d5 3. e5', plies: 5 },
      { name: 'French Defense: Tarrasch', pgn: '1. e4 e6 2. d4 d5 3. Nd2', plies: 5 },
    )
    expect(naturalSide(italian)).toBe('white')
    expect(naturalSide(french)).toBe('black')
  })

  it('has lines to learn on that side for every course of the real library', () => {
    for (const course of coursesFrom(library as OpeningLine[])) {
      expect(linesFor(course, 'full', naturalSide(course)).length).toBeGreaterThan(0)
    }
  })
})
