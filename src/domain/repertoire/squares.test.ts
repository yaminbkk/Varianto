import { DEFAULT_POSITION } from 'chess.js'
import { describe, expect, it } from 'vitest'
import { fenAfterSquares, legalDests, sanFromSquares, sideToMove } from './squares'

describe('sanFromSquares', () => {
  it('returns the SAN of a legal move', () => {
    expect(sanFromSquares(DEFAULT_POSITION, 'e2', 'e4')).toBe('e4')
  })

  it('returns null for an illegal move', () => {
    expect(sanFromSquares(DEFAULT_POSITION, 'e2', 'e5')).toBeNull()
  })

  it('returns null when the wrong side moves', () => {
    expect(sanFromSquares(DEFAULT_POSITION, 'e7', 'e5')).toBeNull()
  })
})

describe('legalDests', () => {
  it('maps each movable square to its legal targets', () => {
    const dests = legalDests(DEFAULT_POSITION)
    expect([...(dests.get('e2') ?? [])].sort()).toEqual(['e3', 'e4'])
    expect([...(dests.get('g1') ?? [])].sort()).toEqual(['f3', 'h3'])
  })

  it('has no entry for squares of the side not to move', () => {
    expect(legalDests(DEFAULT_POSITION).has('e7')).toBe(false)
  })

  it('is empty when the game is over', () => {
    const mated = 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3'
    expect(legalDests(mated).size).toBe(0)
  })
})

describe('sideToMove', () => {
  it('reads the side from the FEN', () => {
    expect(sideToMove(DEFAULT_POSITION)).toBe('white')
    expect(sideToMove('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1')).toBe('black')
  })
})

describe('fenAfterSquares', () => {
  it('returns the position after a legal move', () => {
    const fen = fenAfterSquares(DEFAULT_POSITION, 'e2', 'e4')
    expect(fen?.split(' ')[0]).toBe('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR')
    expect(fen?.split(' ')[1]).toBe('b')
  })

  it('returns null for an illegal move', () => {
    expect(fenAfterSquares(DEFAULT_POSITION, 'e2', 'e5')).toBeNull()
  })
})
