import { describe, expect, it } from 'vitest'
import library from '../../data/openings.json'
import shipped from '../../data/move-explanations.json'
import type { OpeningLine } from '../openings/types'
import { START_FEN } from '../openings/positions'
import { explanationFor, prefixKey, validateExplanations } from './moveExplanations'

const lines: OpeningLine[] = [
  { eco: 'C50', name: 'Italian Game', pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4' },
  { eco: 'B20', name: 'Sicilian Defense', pgn: '1. e4 c5' },
]

describe('prefixKey', () => {
  it('joins the moves up to and including the index', () => {
    expect(prefixKey(['e4', 'e5', 'Nf3'], 0)).toBe('e4')
    expect(prefixKey(['e4', 'e5', 'Nf3'], 2)).toBe('e4 e5 Nf3')
  })
})

describe('explanationFor', () => {
  it('prefers the curated text for the move path', () => {
    const curated = { 'e4 e5 Nf3': 'The knight attacks e5 and develops with tempo.' }
    const sans = ['e4', 'e5', 'Nf3']
    const fen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2'
    expect(explanationFor(curated, sans, 2, fen)).toBe(curated['e4 e5 Nf3'])
  })

  it('falls back to the computed explanation', () => {
    expect(explanationFor({}, ['e4'], 0, START_FEN)).toBe(
      'Claims space in the centre with a pawn on e4 and opens lines for the bishop and queen.',
    )
  })
})

describe('validateExplanations', () => {
  const text = 'This move puts a pawn in the centre and frees the bishop.'

  it('accepts a path that is a prefix of a library line', () => {
    expect(validateExplanations({ 'e4 e5 Nf3': text, e4: text }, lines)).toEqual([])
  })

  it('reports a path that no library line starts with', () => {
    expect(validateExplanations({ 'e4 e5 Qh5': text }, lines)).toHaveLength(1)
  })

  it('reports text that is too short or too long', () => {
    expect(validateExplanations({ e4: 'Short.' }, lines)).toHaveLength(1)
    expect(validateExplanations({ e4: 'x'.repeat(301) }, lines)).toHaveLength(1)
  })

  it('accepts the shipped explanations against the real library', () => {
    expect(
      validateExplanations(shipped as Record<string, string>, library as OpeningLine[]),
    ).toEqual([])
  })
})
