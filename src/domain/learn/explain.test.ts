import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import { explainMove } from './explain'

/** The position after playing the given moves from the start. */
function after(...sans: string[]): string {
  const chess = new Chess()
  for (const san of sans) chess.move(san)
  return chess.fen()
}

describe('explainMove', () => {
  it('explains a centre pawn that opens lines', () => {
    expect(explainMove(after(), 'e4')).toBe(
      'Claims space in the centre with a pawn on e4 and opens lines for the bishop and queen.',
    )
  })

  it('explains a flank pawn move without claiming the centre', () => {
    expect(explainMove(after(), 'a3')).toBe('Moves the pawn to a3.')
  })

  it('explains a developing knight that eyes the centre', () => {
    expect(explainMove(after('e4', 'e5'), 'Nf3')).toBe(
      'Develops the knight to f3, where it eyes the centre squares d4 and e5.',
    )
  })

  it('explains a developing bishop', () => {
    expect(explainMove(after('e4', 'e5', 'Nf3', 'Nc6'), 'Bc4')).toBe(
      'Develops the bishop to c4, where it eyes the centre square d5.',
    )
  })

  it('explains a capture', () => {
    expect(explainMove(after('e4', 'd5'), 'exd5')).toBe('Captures the pawn on d5.')
  })

  it('explains castling', () => {
    const fen = after('e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5')
    expect(explainMove(fen, 'O-O')).toBe(
      'Castles kingside: the king gets safe and the rook joins the game.',
    )
  })

  it('explains queenside castling', () => {
    const fen = after('d4', 'd5', 'Nc3', 'Nc6', 'Bf4', 'Bf5', 'Qd2', 'Qd7')
    expect(explainMove(fen, 'O-O-O')).toBe(
      'Castles queenside: the king gets safe and the rook joins the game.',
    )
  })

  it('adds a note for check and checkmate', () => {
    const fen = after('e4', 'e5', 'Bc4', 'Nc6')
    expect(explainMove(fen, 'Qh5')).toBe('Moves the queen to h5.')
    expect(explainMove(after('e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6'), 'Qxf7#')).toBe(
      'Captures the pawn on f7. This is checkmate.',
    )
    expect(explainMove(after('e4', 'e5', 'Bc4', 'Nc6'), 'Bxf7+')).toBe(
      'Captures the pawn on f7. This gives check.',
    )
  })

  it('explains a promotion', () => {
    expect(explainMove('8/P6k/8/8/8/8/8/K7 w - - 0 1', 'a8=Q')).toBe(
      'Promotes the pawn to a queen on a8.',
    )
  })
})
