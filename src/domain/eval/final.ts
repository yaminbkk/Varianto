import { Chess } from 'chess.js'
import type { Evaluation } from './types'

/**
 * The result of a position that the game is already over in, or null while play goes on
 * (and for an invalid FEN). Engines give no score for these positions.
 */
export function finalEvaluation(fen: string): Evaluation | null {
  try {
    const chess = new Chess(fen)
    if (chess.isCheckmate()) {
      // The side to move is the one that was mated.
      return { kind: 'final', result: chess.turn() === 'w' ? 'black' : 'white' }
    }
    if (chess.isStalemate() || chess.isInsufficientMaterial()) {
      return { kind: 'final', result: 'draw' }
    }
    return null
  } catch {
    return null
  }
}
