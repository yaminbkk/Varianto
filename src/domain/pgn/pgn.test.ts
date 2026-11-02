import { describe, expect, it } from 'vitest'
import { createRepertoire, getChildren, type Repertoire } from '../repertoire/tree'
import { exportPgn, importPgn } from './pgn'

function sequentialIds(prefix = 'n') {
  let i = 0
  return () => `${prefix}${++i}`
}

// Every root-to-leaf line as a space-separated SAN string.
function lines(rep: Repertoire): string[] {
  const out: string[] = []
  const walk = (id: string, acc: string[]) => {
    const kids = getChildren(rep, id)
    if (kids.length === 0) {
      if (acc.length > 0) out.push(acc.join(' '))
      return
    }
    for (const kid of kids) walk(kid.id, [...acc, kid.san ?? ''])
  }
  walk(rep.rootId, [])
  return out
}

function importInto(rep: Repertoire, pgn: string): Repertoire {
  return importPgn(rep, pgn, sequentialIds('i')).repertoire
}

describe('importPgn', () => {
  it('imports a mainline into the tree', () => {
    const rep = createRepertoire('Test', 'white', sequentialIds())
    const result = importInto(rep, '[Event "x"]\n\n1. e4 e5 2. Nf3 Nc6 *\n')

    expect(lines(result)).toEqual(['e4 e5 Nf3 Nc6'])
  })

  it('attaches variations as alternatives to the move they follow', () => {
    const rep = createRepertoire('Test', 'white', sequentialIds())
    const result = importInto(
      rep,
      '[Event "x"]\n\n1. e4 e5 (1... c5 2. Nf3 (2. c3) 2... d6) 2. Nf3 Nc6 *\n',
    )

    expect(lines(result).sort()).toEqual(
      ['e4 c5 Nf3 d6', 'e4 c5 c3', 'e4 e5 Nf3 Nc6'].sort(),
    )
  })

  it('keeps comments on the node they follow', () => {
    const rep = createRepertoire('Test', 'white', sequentialIds())
    const result = importInto(rep, '[Event "x"]\n\n1. e4 {Solid choice} e5 *\n')
    const e4 = getChildren(result, result.rootId)[0]

    expect(e4?.comment).toBe('Solid choice')
  })

  it('strips clock and other [%...] commands from comments', () => {
    const rep = createRepertoire('Test', 'white', sequentialIds())
    const result = importInto(rep, '[Event "x"]\n\n1. e4 {[%clk 0:03:00] Main} e5 *\n')
    const e4 = getChildren(result, result.rootId)[0]

    expect(e4?.comment).toBe('Main')
  })

  it('merges several games into one tree without duplicating shared moves', () => {
    const rep = createRepertoire('Test', 'white', sequentialIds())
    const result = importInto(
      rep,
      '[Event "a"]\n\n1. e4 e5 *\n\n[Event "b"]\n\n1. e4 c5 *\n',
    )

    expect(getChildren(result, result.rootId)).toHaveLength(1)
    expect(lines(result).sort()).toEqual(['e4 c5', 'e4 e5'])
  })

  it('accepts a game that starts from the repertoire start position', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'
    const rep = createRepertoire('Test', 'black', sequentialIds(), fen)
    const result = importInto(
      rep,
      `[Event "x"]\n[FEN "${fen}"]\n[SetUp "1"]\n\n1... c5 2. Nf3 *\n`,
    )

    expect(lines(result)).toEqual(['c5 Nf3'])
  })

  it('rejects a game that starts from a different position', () => {
    const rep = createRepertoire('Test', 'white', sequentialIds())
    const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'

    expect(() =>
      importPgn(rep, `[Event "x"]\n[FEN "${fen}"]\n\n1... c5 *\n`, sequentialIds('i')),
    ).toThrow(/different position/)
  })

  it('rejects an illegal move in the PGN', () => {
    const rep = createRepertoire('Test', 'white', sequentialIds())
    expect(() => importPgn(rep, '[Event "x"]\n\n1. e4 e4 *\n', sequentialIds('i'))).toThrow()
  })
})

describe('exportPgn', () => {
  it('writes a mainline with move numbers and a result marker', () => {
    const rep = createRepertoire('Italian', 'white', sequentialIds())
    const imported = importInto(rep, '[Event "x"]\n\n1. e4 e5 2. Nf3 Nc6 *\n')
    const pgn = exportPgn(imported)

    expect(pgn).toContain('[Event "Italian"]')
    expect(pgn).toContain('1. e4 e5 2. Nf3 Nc6 *')
  })

  it('writes alternatives in parentheses after the move they replace', () => {
    const rep = createRepertoire('Test', 'white', sequentialIds())
    const imported = importInto(rep, '[Event "x"]\n\n1. e4 e5 (1... c5) 2. Nf3 *\n')

    expect(exportPgn(imported)).toContain('1. e4 e5 (1... c5) 2. Nf3 *')
  })

  it('writes comments in braces', () => {
    const rep = createRepertoire('Test', 'white', sequentialIds())
    const imported = importInto(rep, '[Event "x"]\n\n1. e4 {Solid} e5 *\n')

    expect(exportPgn(imported)).toContain('1. e4 {Solid} 1... e5 *')
  })

  it('round-trips variations and comments without changing the lines', () => {
    const rep = createRepertoire('Test', 'white', sequentialIds())
    const source = importInto(
      rep,
      '[Event "x"]\n\n1. e4 {Main} e5 (1... c5 2. Nf3 (2. c3) 2... d6) 2. Nf3 Nc6 (2... Nf6) *\n',
    )

    const reimported = importInto(
      createRepertoire('Test', 'white', sequentialIds('r')),
      exportPgn(source),
    )

    expect(lines(reimported).sort()).toEqual(lines(source).sort())
    const e4 = getChildren(reimported, reimported.rootId)[0]
    expect(e4?.comment).toBe('Main')
  })

  it('exports an empty repertoire as a game with no moves', () => {
    const rep = createRepertoire('Empty', 'white', sequentialIds())
    expect(exportPgn(rep)).toContain('[Event "Empty"]')
    expect(exportPgn(rep).trim().endsWith('*')).toBe(true)
  })
})
