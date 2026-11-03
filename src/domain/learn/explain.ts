import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js'

const NAMES: Record<PieceSymbol, string> = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
}

const CENTRE: Square[] = ['d4', 'e4', 'd5', 'e5']

function listOf(items: string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

/** Centre squares the piece on `square` attacks in the position after the move. */
function centreSquaresAttackedBy(chess: Chess, square: Square, color: Color): Square[] {
  return CENTRE.filter((c) => chess.attackers(c, color).includes(square)).sort((a, b) =>
    a.localeCompare(b),
  )
}

function describe(move: Move, chess: Chess): string {
  const name = NAMES[move.piece]

  if (move.isKingsideCastle())
    return 'Castles kingside: the king gets safe and the rook joins the game.'
  if (move.isQueensideCastle())
    return 'Castles queenside: the king gets safe and the rook joins the game.'
  if (move.promotion) return `Promotes the pawn to a ${NAMES[move.promotion]} on ${move.to}.`
  if (move.captured) return `Captures the ${NAMES[move.captured]} on ${move.to}.`

  if (move.piece === 'p') {
    if (!CENTRE.includes(move.to)) return `Moves the pawn to ${move.to}.`
    const opensLines =
      (move.from[0] === 'd' || move.from[0] === 'e') &&
      (move.from[1] === '2' || move.from[1] === '7')
    const base = `Claims space in the centre with a pawn on ${move.to}`
    return opensLines ? `${base} and opens lines for the bishop and queen.` : `${base}.`
  }

  const homeRank = move.color === 'w' ? '1' : '8'
  if ((move.piece === 'n' || move.piece === 'b') && move.from[1] === homeRank) {
    const eyed = centreSquaresAttackedBy(chess, move.to, move.color)
    const base = `Develops the ${name} to ${move.to}`
    if (eyed.length === 0) return `${base}.`
    return `${base}, where it eyes the centre ${eyed.length === 1 ? 'square' : 'squares'} ${listOf(eyed)}.`
  }

  return `Moves the ${name} to ${move.to}.`
}

/**
 * A short, always-true explanation of a move, worked out from the position before it.
 * Curated, opening-specific text takes precedence over this where it exists.
 */
export function explainMove(fenBefore: string, san: string): string {
  const chess = new Chess(fenBefore)
  const move = chess.move(san)
  const text = describe(move, chess)
  if (chess.isCheckmate()) return `${text} This is checkmate.`
  if (chess.inCheck()) return `${text} This gives check.`
  return text
}
