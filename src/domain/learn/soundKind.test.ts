import { describe, expect, it } from 'vitest'
import { soundKindFor } from './soundKind'

describe('soundKindFor', () => {
  it('uses the move sound for a quiet move', () => {
    expect(soundKindFor('e4')).toBe('move')
    expect(soundKindFor('Nf3')).toBe('move')
  })

  it('uses the capture sound for captures', () => {
    expect(soundKindFor('exd5')).toBe('capture')
    expect(soundKindFor('Bxc6')).toBe('capture')
  })

  it('uses the castle sound for castling', () => {
    expect(soundKindFor('O-O')).toBe('castle')
    expect(soundKindFor('O-O-O')).toBe('castle')
  })

  it('uses the check sound for check and checkmate, even with a capture', () => {
    expect(soundKindFor('Bb5+')).toBe('check')
    expect(soundKindFor('Qxf7#')).toBe('check')
  })
})
