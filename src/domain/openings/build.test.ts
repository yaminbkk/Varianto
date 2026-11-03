/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildOpeningLibrary } from './build'

const HEADER = 'eco\tname\tpgn'

describe('buildOpeningLibrary', () => {
  it('merges files and sorts by eco then name', () => {
    const files = [
      { label: 'b.tsv', text: `${HEADER}\nB00\tZeta\t1. e4\nB00\tAlpha\t1. e4 b6\n` },
      { label: 'a.tsv', text: `${HEADER}\nA00\tMid\t1. Nh3\nA00\tFirst\t1. a3\n` },
    ]
    expect(buildOpeningLibrary(files)).toEqual([
      { eco: 'A00', name: 'First', pgn: '1. a3' },
      { eco: 'A00', name: 'Mid', pgn: '1. Nh3' },
      { eco: 'B00', name: 'Alpha', pgn: '1. e4 b6' },
      { eco: 'B00', name: 'Zeta', pgn: '1. e4' },
    ])
  })

  it('rejects a duplicate across files and names both locations', () => {
    const files = [
      { label: 'a.tsv', text: `${HEADER}\nA00\tFirst\t1. a3\nA00\tDup\t1. Nh3\n` },
      { label: 'b.tsv', text: `${HEADER}\nB00\tOther\t1. e4\n\nA00\tDup\t1.Nh3\n` },
    ]
    expect(() => buildOpeningLibrary(files)).toThrow(/a\.tsv:3.*b\.tsv:4|b\.tsv:4.*a\.tsv:3/)
  })

  it('committed openings.json matches a fresh build', () => {
    const dir = join(process.cwd(), 'data', 'openings')
    const files = ['a', 'b', 'c', 'd', 'e'].map((letter) => ({
      label: `${letter}.tsv`,
      text: readFileSync(join(dir, `${letter}.tsv`), 'utf8'),
    }))
    const committed: unknown = JSON.parse(
      readFileSync(join(process.cwd(), 'src', 'data', 'openings.json'), 'utf8'),
    )
    expect(
      committed,
      'src/data/openings.json is stale: run "npm run openings" and commit the result',
    ).toEqual(buildOpeningLibrary(files))
  })
})
