import { describe, expect, it } from 'vitest'
import library from '../../data/openings.json'
import { keyIndex, openingKey } from './key'
import type { OpeningLine } from './types'

describe('openingKey', () => {
  it('joins the lower-cased ECO and a slug of the name', () => {
    const line: OpeningLine = { eco: 'C50', name: 'Italian Game: Giuoco Piano', pgn: '1. e4 e5' }
    expect(openingKey(line)).toBe('c50-italian-game-giuoco-piano')
  })

  it('produces only URL-safe characters', () => {
    const line: OpeningLine = {
      eco: 'B01',
      name: "Scandinavian Defense: Mieses-Kotroc, O'Kelly!",
      pgn: '1. e4 d5',
    }
    expect(openingKey(line)).toMatch(/^[a-z0-9-]+$/)
  })
})

describe('keyIndex', () => {
  it('gives every line of the real library its own key', () => {
    const index = keyIndex(library as OpeningLine[])
    expect(index.size).toBe(library.length)
  })

  it('resolves a key back to its line', () => {
    const lines: OpeningLine[] = [
      { eco: 'A00', name: 'Amar Opening', pgn: '1. Nh3' },
      { eco: 'A00', name: 'Amar Opening', pgn: '1. Nh3 d5' },
    ]
    const index = keyIndex(lines)
    expect([...index.keys()]).toEqual(['a00-amar-opening', 'a00-amar-opening-2'])
    expect(index.get('a00-amar-opening-2')).toBe(lines[1])
  })
})
