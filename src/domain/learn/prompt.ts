const PIECES: Record<string, string> = {
  N: 'knight',
  B: 'bishop',
  R: 'rook',
  Q: 'queen',
  K: 'king',
}

/** Plain-language instruction for a SAN move, such as "Play knight to f3." */
export function promptFor(san: string): string {
  const suffix = san.endsWith('#')
    ? ' This is checkmate.'
    : san.endsWith('+')
      ? ' This gives check.'
      : ''
  const move = san.replace(/[+#]$/, '')

  if (move === 'O-O') return `Castle kingside.${suffix}`
  if (move === 'O-O-O') return `Castle queenside.${suffix}`

  const m = /^([NBRQK])?([a-h])?([1-8])?(x)?([a-h][1-8])(?:=([NBRQ]))?$/.exec(move)
  if (!m) return `Play ${move}.${suffix}`
  const [, piece, file, rank, capture, target, promotion] = m

  const who = piece ? (PIECES[piece] ?? 'piece') : 'pawn'
  const promote = promotion ? ` and promote to a ${PIECES[promotion] ?? 'piece'}` : ''

  // The mover with an article: "the bishop", "the b-file knight", "the knight on rank 1", "the e-pawn".
  let described = `the ${who}`
  if (piece && file) described = `the ${file}-file ${who}`
  else if (piece && rank) described = `the ${who} on rank ${rank}`
  else if (!piece && capture) described = `the ${file ?? ''}-pawn`

  if (capture) return `Capture on ${target} with ${described}${promote}.${suffix}`
  // A plain move names just the piece ("Play knight to f3"); a disambiguated one keeps its article.
  const subject = described === `the ${who}` ? who : described
  return `Play ${subject} to ${target}${promote}.${suffix}`
}
