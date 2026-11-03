import { Chess, type PieceSymbol } from 'chess.js'
import { useMemo } from 'react'
import type { Color } from '../domain/repertoire/tree'

// The solid glyphs are used for both colours and painted white or black, so every piece has one shape.
const GLYPHS: Record<PieceSymbol, string> = {
  k: '♚',
  q: '♛',
  r: '♜',
  b: '♝',
  n: '♞',
  p: '♟',
}

const LIGHT = '#f0d9b5'
const DARK = '#b58863'

/** A small, static picture of a position. Decorative: the text next to it names the opening. */
export default function MiniBoard({ fen, orientation }: { fen: string; orientation: Color }) {
  const { darkSquares, pieces } = useMemo(() => {
    const rows = new Chess(fen).board()
    const dark: string[] = []
    const found: { key: string; x: number; y: number; glyph: string; color: Color }[] = []
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        // r is the rank from 8 down to 1 and c the file from a to h; flip both for Black's view.
        const x = orientation === 'white' ? c : 7 - c
        const y = orientation === 'white' ? r : 7 - r
        if ((r + c) % 2 === 1) dark.push(`M${x} ${y}h1v1h-1z`)
        const piece = rows[r]?.[c]
        if (piece) {
          found.push({
            key: piece.square,
            x,
            y,
            glyph: GLYPHS[piece.type],
            color: piece.color === 'w' ? 'white' : 'black',
          })
        }
      }
    }
    return { darkSquares: dark.join(''), pieces: found }
  }, [fen, orientation])

  return (
    <svg className="mini-board" viewBox="0 0 8 8" aria-hidden="true" focusable="false">
      <rect width="8" height="8" fill={LIGHT} />
      <path d={darkSquares} fill={DARK} />
      {pieces.map((p) => (
        <text
          key={p.key}
          x={p.x + 0.5}
          y={p.y + 0.8}
          fontSize="0.9"
          textAnchor="middle"
          fill={p.color === 'white' ? '#ffffff' : '#111111'}
          stroke={p.color === 'white' ? '#111111' : '#ffffff'}
          strokeWidth="0.03"
          paintOrder="stroke"
        >
          {p.glyph}
        </text>
      ))}
    </svg>
  )
}
