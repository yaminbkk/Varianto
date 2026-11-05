import { describe, expect, it } from 'vitest'
import { finalEvaluation } from './final'

describe('finalEvaluation', () => {
  it('gives the win to the side that delivered checkmate', () => {
    const foolsMate = 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3'
    expect(finalEvaluation(foolsMate)).toEqual({ kind: 'final', result: 'black' })
  })

  it('calls stalemate and bare kings a draw', () => {
    expect(finalEvaluation('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1')).toEqual({
      kind: 'final',
      result: 'draw',
    })
    expect(finalEvaluation('8/8/4k3/8/8/4K3/8/8 w - - 0 1')).toEqual({
      kind: 'final',
      result: 'draw',
    })
  })

  it('returns null while the game goes on', () => {
    expect(finalEvaluation('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')).toBeNull()
  })

  it('returns null for an invalid FEN', () => {
    expect(finalEvaluation('not a fen')).toBeNull()
  })
})
