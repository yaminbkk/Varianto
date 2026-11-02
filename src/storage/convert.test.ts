import { describe, expect, it } from 'vitest'
import { addMove, createRepertoire } from '../domain/repertoire/tree'
import { fromRows, toRows } from './convert'

// Deterministic ids so tests can refer to nodes by name.
function sequentialIds(prefix = 'n') {
  let i = 0
  return () => `${prefix}${++i}`
}

function branchedRepertoire() {
  const start = createRepertoire('Open Games', 'white', sequentialIds())
  const e4 = addMove(start, start.rootId, 'e4', sequentialIds('a'))
  const e5 = addMove(e4.repertoire, e4.nodeId, 'e5', sequentialIds('b'))
  const nf3 = addMove(e5.repertoire, e5.nodeId, 'Nf3', sequentialIds('c'))
  const c5 = addMove(nf3.repertoire, e4.nodeId, 'c5', sequentialIds('d'))
  return c5.repertoire
}

describe('toRows / fromRows', () => {
  it('round-trips a fresh repertoire', () => {
    const rep = createRepertoire('Italian', 'white', sequentialIds())
    const { repertoire, nodes } = toRows(rep)

    expect(fromRows(repertoire, nodes)).toEqual(rep)
  })

  it('round-trips a branched repertoire', () => {
    const rep = branchedRepertoire()
    const { repertoire, nodes } = toRows(rep)

    expect(fromRows(repertoire, nodes)).toEqual(rep)
  })

  it('round-trips a FEN-started repertoire', () => {
    const fen = '8/8/4k3/8/8/4K3/4P3/8 b - - 0 1'
    const rep = createRepertoire('End', 'black', sequentialIds(), fen)
    const { repertoire, nodes } = toRows(rep)

    expect(fromRows(repertoire, nodes)).toEqual(rep)
  })

  it('tags every node row with the repertoire id', () => {
    const rep = branchedRepertoire()
    const { nodes } = toRows(rep)

    expect(nodes).toHaveLength(Object.keys(rep.nodes).length)
    for (const node of nodes) expect(node.repertoireId).toBe(rep.id)
  })

  it('does not mutate the input', () => {
    const rep = branchedRepertoire()
    const before = structuredClone(rep)

    const { repertoire, nodes } = toRows(rep)
    fromRows(repertoire, nodes)

    expect(rep).toEqual(before)
  })

  it('fromRows ignores row order', () => {
    const rep = branchedRepertoire()
    const { repertoire, nodes } = toRows(rep)

    expect(fromRows(repertoire, [...nodes].reverse())).toEqual(rep)
  })
})
