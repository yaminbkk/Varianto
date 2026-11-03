import { Chess } from 'chess.js'

/**
 * SAN of the move from `from` to `to` in the position `fen`, or null if the
 * move is illegal. Promotions are always to a queen.
 */
export function sanFromSquares(fen: string, from: string, to: string): string | null {
  try {
    return new Chess(fen).move({ from, to, promotion: 'q' }).san
  } catch {
    return null
  }
}
