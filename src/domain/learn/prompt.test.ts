import { describe, expect, it } from 'vitest'
import { promptFor } from './prompt'

describe('promptFor', () => {
  it.each([
    ['e4', 'Play pawn to e4.'],
    ['Nf3', 'Play knight to f3.'],
    ['Bxc6', 'Capture on c6 with the bishop.'],
    ['exd5', 'Capture on d5 with the e-pawn.'],
    ['O-O', 'Castle kingside.'],
    ['O-O-O', 'Castle queenside.'],
    ['e8=Q', 'Play pawn to e8 and promote to a queen.'],
    ['Nbd7', 'Play the b-file knight to d7.'],
    ['N1f3', 'Play the knight on rank 1 to f3.'],
    ['Bb5+', 'Play bishop to b5. This gives check.'],
    ['Qh5#', 'Play queen to h5. This is checkmate.'],
    ['O-O+', 'Castle kingside. This gives check.'],
  ])('words %s as "%s"', (san, expected) => {
    expect(promptFor(san)).toBe(expected)
  })
})
