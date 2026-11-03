import { DEFAULT_POSITION } from 'chess.js'
import { describe, expect, it } from 'vitest'
import { sanFromSquares } from './squares'

describe('sanFromSquares', () => {
  it('returns the SAN of a legal move', () => {
    expect(sanFromSquares(DEFAULT_POSITION, 'e2', 'e4')).toBe('e4')
  })

  it('returns null for an illegal move', () => {
    expect(sanFromSquares(DEFAULT_POSITION, 'e2', 'e5')).toBeNull()
  })

  it('returns null when the wrong side moves', () => {
    expect(sanFromSquares(DEFAULT_POSITION, 'e7', 'e5')).toBeNull()
  })
})
