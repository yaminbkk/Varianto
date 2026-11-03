import { describe, expect, it } from 'vitest'
import { pgnFileName } from './filename'

describe('pgnFileName', () => {
  it('lowercases and collapses punctuation into dashes', () => {
    expect(pgnFileName('My Sicilian: Najdorf!')).toBe('my-sicilian-najdorf.pgn')
  })

  it('falls back to a default when nothing usable remains', () => {
    expect(pgnFileName('   ')).toBe('repertoire.pgn')
  })

  it('turns spaces into dashes', () => {
    expect(pgnFileName('Ruy Lopez')).toBe('ruy-lopez.pgn')
  })
})
