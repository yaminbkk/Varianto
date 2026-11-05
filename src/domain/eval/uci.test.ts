import { describe, expect, it } from 'vitest'
import { parseInfoLine } from './uci'

const WHITE = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const BLACK = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'

describe('parseInfoLine', () => {
  it('reads a centipawn score with its depth', () => {
    const line = 'info depth 12 seldepth 18 multipv 1 score cp 34 nodes 1000 pv e2e4'
    expect(parseInfoLine(line, WHITE)).toEqual({ kind: 'cp', value: 34, depth: 12 })
  })

  it('flips the sign to White when Black is to move', () => {
    const line = 'info depth 12 seldepth 18 multipv 1 score cp 34 nodes 1000 pv e7e5'
    expect(parseInfoLine(line, BLACK)).toEqual({ kind: 'cp', value: -34, depth: 12 })
  })

  it('reads mate scores from White point of view', () => {
    expect(parseInfoLine('info depth 20 score mate 3 pv a1a2', WHITE)).toEqual({
      kind: 'mate',
      value: 3,
      depth: 20,
    })
    expect(parseInfoLine('info depth 20 score mate 2 pv a1a2', BLACK)).toEqual({
      kind: 'mate',
      value: -2,
      depth: 20,
    })
    expect(parseInfoLine('info depth 20 score mate -4 pv a1a2', WHITE)).toEqual({
      kind: 'mate',
      value: -4,
      depth: 20,
    })
  })

  it('ignores bound scores', () => {
    expect(parseInfoLine('info depth 9 score cp 50 lowerbound nodes 5', WHITE)).toBeNull()
    expect(parseInfoLine('info depth 9 score cp 50 upperbound nodes 5', WHITE)).toBeNull()
  })

  it('ignores lines that carry no score', () => {
    expect(parseInfoLine('info string NNUE evaluation using nn.nnue', WHITE)).toBeNull()
    expect(parseInfoLine('info depth 5 currmove e2e4 currmovenumber 1', WHITE)).toBeNull()
    expect(parseInfoLine('bestmove e2e4', WHITE)).toBeNull()
    expect(parseInfoLine('readyok', WHITE)).toBeNull()
    expect(parseInfoLine('', WHITE)).toBeNull()
  })
})
