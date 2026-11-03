import { describe, expect, it } from 'vitest'
import { ILLEGAL_MOVE_MESSAGE, friendlyError } from './messages'

describe('friendlyError', () => {
  it('replaces the domain illegal-move error, which embeds a FEN', () => {
    const raw =
      'Illegal move Qh5 in position rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    expect(friendlyError(raw)).toBe(ILLEGAL_MOVE_MESSAGE)
  })

  it('passes other messages through', () => {
    expect(friendlyError('Cannot delete the root.')).toBe('Cannot delete the root.')
  })

  it('passes null through', () => {
    expect(friendlyError(null)).toBeNull()
  })
})
