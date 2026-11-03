import { describe, expect, it } from 'vitest'
import { parseOpeningsTsv } from './parse'

const HEADER = 'eco\tname\tpgn'

describe('parseOpeningsTsv', () => {
  it('parses a header and one row into an OpeningLine', () => {
    const text = `${HEADER}\nA00\tAmar Opening\t1. Nh3\n`
    expect(parseOpeningsTsv(text, 'test.tsv')).toEqual([
      { eco: 'A00', name: 'Amar Opening', pgn: '1. Nh3' },
    ])
  })

  it('accepts CRLF line endings and trims cells', () => {
    const text = `${HEADER}\r\nA00 \t Amar Opening  \t 1. Nh3 \r\n`
    expect(parseOpeningsTsv(text, 'test.tsv')).toEqual([
      { eco: 'A00', name: 'Amar Opening', pgn: '1. Nh3' },
    ])
  })

  it('strips a trailing result token before validation', () => {
    const text = `${HEADER}\nC20\tKing's Pawn Game\t1. e4 e5 1-0\n`
    expect(parseOpeningsTsv(text, 'test.tsv')).toEqual([
      { eco: 'C20', name: "King's Pawn Game", pgn: '1. e4 e5' },
    ])
  })

  it('rejects an illegal move with the row number', () => {
    const text = `${HEADER}\nA00\tBad Opening\t1. e5\n`
    expect(() => parseOpeningsTsv(text, 'test.tsv')).toThrow(/test\.tsv:2:/)
  })

  it('rejects an empty pgn cell', () => {
    const text = `${HEADER}\nA00\tAmar Opening\t\n`
    expect(() => parseOpeningsTsv(text, 'test.tsv')).toThrow(/test\.tsv:2:/)
  })

  it('rejects an empty name cell', () => {
    const text = `${HEADER}\nA00\t\t1. Nh3\n`
    expect(() => parseOpeningsTsv(text, 'test.tsv')).toThrow(/test\.tsv:2:/)
  })

  it('accepts the same eco and name with a different pgn', () => {
    const text = `${HEADER}\nA00\tAmar Opening\t1. Nh3\nA00\tAmar Opening\t1. Nh3 d5\n`
    expect(parseOpeningsTsv(text, 'test.tsv')).toEqual([
      { eco: 'A00', name: 'Amar Opening', pgn: '1. Nh3' },
      { eco: 'A00', name: 'Amar Opening', pgn: '1. Nh3 d5' },
    ])
  })

  it('rejects an exact duplicate row within one text', () => {
    const row = 'A00\tAmar Opening\t1. Nh3'
    const text = `${HEADER}\n${row}\n${row}\n`
    expect(() => parseOpeningsTsv(text, 'test.tsv')).toThrow(
      /Duplicate opening A00 "Amar Opening"/,
    )
  })

  it('preserves non-ASCII names', () => {
    const text = `${HEADER}\nC30\tGambito del Rey Ñ\t1. e4 e5 2. f4\n`
    expect(parseOpeningsTsv(text, 'test.tsv')[0]?.name).toBe('Gambito del Rey Ñ')
  })
})
