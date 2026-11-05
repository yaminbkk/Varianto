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

/**
 * The position (FEN) after the move from `from` to `to` in the position `fen`, or null if the
 * move is illegal. Promotions are always to a queen.
 */
export function fenAfterSquares(fen: string, from: string, to: string): string | null {
  try {
    const chess = new Chess(fen)
    chess.move({ from, to, promotion: 'q' })
    return chess.fen()
  } catch {
    return null
  }
}

/** Legal target squares for each movable square in the position `fen`. */
export function legalDests(fen: string): Map<string, string[]> {
  const dests = new Map<string, string[]>()
  for (const move of new Chess(fen).moves({ verbose: true })) {
    const targets = dests.get(move.from)
    if (targets) targets.push(move.to)
    else dests.set(move.from, [move.to])
  }
  return dests
}

/** The side whose turn it is in the position `fen`. */
export function sideToMove(fen: string): 'white' | 'black' {
  return fen.split(' ')[1] === 'b' ? 'black' : 'white'
}
