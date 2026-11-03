import { describe, expect, it } from 'vitest'
import { describeOpening, type OpeningDescription } from './describe'
import { ecoFamily } from './ecoFamily'
import { openingKey } from './key'
import type { OpeningLine } from './types'

const italian: OpeningLine = {
  eco: 'C50',
  name: 'Italian Game',
  pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4',
}

describe('ecoFamily', () => {
  it.each([
    ['A00', 'Flank openings (A)'],
    ['B20', 'Semi-open games (B)'],
    ['C50', 'Open games (C)'],
    ['D02', 'Closed games (D)'],
    ['E60', 'Indian defences (E)'],
  ])('labels %s as %s', (eco, label) => {
    expect(ecoFamily(eco)).toBe(label)
  })
})

describe('describeOpening', () => {
  it('has no description and reports facts when no entry exists', () => {
    const info = describeOpening(italian, {})
    expect(info.description).toBeNull()
    expect(info.title).toBe('Italian Game')
    expect(info.family).toBe('Open games (C)')
    expect(info.moveCount).toBe(5)
    expect(info.mainLine).toBe('1. e4 e5 2. Nf3 Nc6 3. Bc4')
  })

  it('returns the curated description unchanged when an entry exists', () => {
    const entry: OpeningDescription = { summary: 'x'.repeat(50), ideas: ['Develop quickly.'] }
    const info = describeOpening(italian, { [openingKey(italian)]: entry })
    expect(info.description).toBe(entry)
  })
})
