import { describe, expect, it } from 'vitest'
import library from '../../data/openings.json'
import { sanSequence } from './parse'
import { openingPositions, START_FEN } from './positions'
import type { OpeningLine } from './types'

const lines = library as OpeningLine[]

describe('openingPositions', () => {
  it('returns the move and resulting position for each ply', () => {
    const positions = openingPositions({ eco: 'C20', name: 'King’s Pawn Game', pgn: '1. e4 e5' })
    expect(positions.map((p) => p.san)).toEqual(['e4', 'e5'])
    expect(positions[0]?.fen).toBe('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1')
  })

  it('exports the standard start position', () => {
    expect(START_FEN).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
  })

  it('has one position per move for sampled library lines and the longest one', () => {
    const longest = lines.reduce((a, b) => (a.pgn.length >= b.pgn.length ? a : b))
    const sample = [...lines.filter((_, i) => i % 20 === 0), longest]
    for (const line of sample) {
      expect(openingPositions(line)).toHaveLength(sanSequence(line.pgn).split(' ').length)
    }
  })
})
