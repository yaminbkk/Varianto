import { describe, expect, it } from 'vitest'
import library from '../../data/openings.json'
import descriptions from '../../data/opening-descriptions.json'
import type { OpeningDescription } from './describe'
import { validateDescriptions } from './validateDescriptions'
import type { OpeningLine } from './types'

const lines: OpeningLine[] = [
  { eco: 'C50', name: 'Italian Game', pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4' },
  { eco: 'A00', name: 'Amar Opening', pgn: '1. Nh3' },
  { eco: 'A00', name: 'Amar Opening', pgn: '1. Nh3 d5' },
]
const goodSummary = 'White develops the bishop to c4 and eyes the weak f7 square early on.'

function check(entries: Record<string, OpeningDescription>): string[] {
  return validateDescriptions(entries, lines)
}

describe('validateDescriptions', () => {
  it('accepts a valid entry', () => {
    expect(check({ 'c50-italian-game': { summary: goodSummary } })).toEqual([])
  })

  it('reports an unknown key', () => {
    expect(check({ 'z99-nothing': { summary: goodSummary } })).toHaveLength(1)
  })

  it('reports a key that collides with an earlier line (suffixed key)', () => {
    expect(check({ 'a00-amar-opening-2': { summary: goodSummary } })).toHaveLength(1)
  })

  it('reports a summary that is too short or too long', () => {
    expect(check({ 'c50-italian-game': { summary: 'Too short.' } })).toHaveLength(1)
    expect(check({ 'c50-italian-game': { summary: 'x'.repeat(401) } })).toHaveLength(1)
  })

  it('reports more than three ideas or an idea over 160 characters', () => {
    const ideas = ['a', 'b', 'c', 'd']
    expect(check({ 'c50-italian-game': { summary: goodSummary, ideas } })).toHaveLength(1)
    expect(
      check({ 'c50-italian-game': { summary: goodSummary, ideas: ['x'.repeat(161)] } }),
    ).toHaveLength(1)
  })

  it('reports a backticked move that is not in the line', () => {
    const summary = `${goodSummary} Later White can play \`Qh5\` to attack.`
    expect(check({ 'c50-italian-game': { summary } })).toHaveLength(1)
  })

  it('accepts a backticked move that is in the line', () => {
    const summary = `${goodSummary} The key move is \`Bc4\`.`
    expect(check({ 'c50-italian-game': { summary } })).toEqual([])
  })

  it('accepts the shipped descriptions against the real library', () => {
    const shipped = descriptions as Record<string, OpeningDescription>
    expect(validateDescriptions(shipped, library as OpeningLine[])).toEqual([])
  })
})
