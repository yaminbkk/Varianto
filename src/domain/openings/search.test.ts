import { describe, expect, it } from 'vitest'
import { findOpenings } from './search'
import type { OpeningLine } from './types'

const lines: OpeningLine[] = [
  { eco: 'A00', name: 'Amar Opening: Paris Gambit', pgn: '1. Nh3 d5 2. g3 e5 3. f4' },
  { eco: 'A00', name: 'Anderssen Opening', pgn: '1. a3' },
  { eco: 'B20', name: 'Gambito del Rey Ñ', pgn: '1. e4 c5' },
]

describe('findOpenings', () => {
  it('matches name case-insensitively', () => {
    expect(findOpenings(lines, 'paris')).toEqual([lines[0]])
  })

  it('matches the ECO code', () => {
    expect(findOpenings(lines, 'a00')).toEqual([lines[0], lines[1]])
  })

  it('returns every line for an empty query', () => {
    expect(findOpenings(lines, '')).toEqual(lines)
    expect(findOpenings(lines, '   ')).toEqual(lines)
  })

  it('returns a new array rather than the input', () => {
    expect(findOpenings(lines, '')).not.toBe(lines)
    expect(findOpenings(lines, 'a00')).not.toBe(lines)
  })

  it('returns an empty array when nothing matches', () => {
    expect(findOpenings(lines, 'zzz')).toEqual([])
  })

  it('matches accented names without normalizing them', () => {
    expect(findOpenings(lines, 'ñ')).toEqual([lines[2]])
  })

  it('does not mutate the input array', () => {
    const frozen = Object.freeze([...lines])
    expect(() => findOpenings(frozen, 'a')).not.toThrow()
    expect(frozen).toHaveLength(3)
  })
})
