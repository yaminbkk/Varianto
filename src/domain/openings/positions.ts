import { Chess } from 'chess.js'
import { sanSequence } from './parse'
import type { OpeningLine } from './types'

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

/** The move and the resulting position after each ply of the line. */
export function openingPositions(line: OpeningLine): { san: string; fen: string }[] {
  const chess = new Chess()
  const result: { san: string; fen: string }[] = []
  for (const san of sanSequence(line.pgn).split(' ')) {
    if (san === '') continue
    chess.move(san, { strict: true })
    result.push({ san, fen: chess.fen() })
  }
  return result
}
