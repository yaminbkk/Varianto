import { describe, expect, it } from 'vitest'
import { createRepertoire, getChildren, getLine, type Repertoire } from '../repertoire/tree'
import { addOpeningToRepertoire } from './addToRepertoire'
import type { OpeningLine } from './types'

const parisGambit: OpeningLine = {
  eco: 'A00',
  name: 'Amar Opening: Paris Gambit',
  pgn: '1. Nh3 d5 2. g3 e5 3. f4',
}

function sequentialIds(prefix = 'n') {
  let i = 0
  return () => `${prefix}${++i}`
}

// SAN moves along the first child of every node, from the root to the end of the line.
function mainline(rep: Repertoire): string[] {
  let id = rep.rootId
  for (let first = getChildren(rep, id)[0]; first; first = getChildren(rep, id)[0]) {
    id = first.id
  }
  return getLine(rep, id)
    .slice(1)
    .map((node) => node.san ?? '')
}

describe('addOpeningToRepertoire', () => {
  it("copies the line's moves as nodes", () => {
    const rep = createRepertoire('Test', 'white', sequentialIds())
    const { repertoire, games } = addOpeningToRepertoire(rep, parisGambit, sequentialIds('i'))

    expect(games).toBe(1)
    expect(mainline(repertoire)).toEqual(['Nh3', 'd5', 'g3', 'e5', 'f4'])
  })

  it('importing the same line twice does not duplicate branches', () => {
    const rep = createRepertoire('Test', 'white', sequentialIds())
    const first = addOpeningToRepertoire(rep, parisGambit, sequentialIds('i')).repertoire
    const second = addOpeningToRepertoire(first, parisGambit, sequentialIds('j')).repertoire

    expect(Object.keys(second.nodes).length).toBe(Object.keys(first.nodes).length)
  })

  it('does not mutate the input repertoire', () => {
    const rep = createRepertoire('Test', 'white', sequentialIds())
    const snapshot = structuredClone(rep)

    addOpeningToRepertoire(rep, parisGambit, sequentialIds('i'))

    expect(rep).toEqual(snapshot)
  })
})
