import { describe, expect, it } from 'vitest'
import { DEFAULT_POSITION } from 'chess.js'
import {
  addMove,
  createRepertoire,
  deleteNode,
  getChildren,
  getLine,
  isUserTurn,
  positionKey,
  setComment,
} from './tree'

// Deterministic ids so tests can refer to nodes by name.
function sequentialIds(prefix = 'n') {
  let i = 0
  return () => `${prefix}${++i}`
}

describe('createRepertoire', () => {
  it('starts with a root node at the initial position', () => {
    const rep = createRepertoire('Italian', 'white', sequentialIds())
    const root = rep.nodes[rep.rootId]

    expect(rep.name).toBe('Italian')
    expect(rep.color).toBe('white')
    expect(root).toBeDefined()
    expect(root?.parentId).toBeNull()
    expect(root?.san).toBeNull()
    expect(root?.fen).toBe(DEFAULT_POSITION)
    expect(root?.childIds).toEqual([])
  })
})

describe('addMove', () => {
  it('adds a legal move as a child and records the parent link', () => {
    const rep = createRepertoire('Test', 'white', sequentialIds())
    const { repertoire, nodeId } = addMove(rep, rep.rootId, 'e4', sequentialIds('m'))
    const node = repertoire.nodes[nodeId]

    expect(node?.parentId).toBe(rep.rootId)
    expect(node?.san).toBe('e4')
    expect(node?.fen).toContain('4P3')
    expect(repertoire.nodes[rep.rootId]?.childIds).toEqual([nodeId])
  })

  it('does not mutate the original repertoire', () => {
    const rep = createRepertoire('Test', 'white', sequentialIds())
    addMove(rep, rep.rootId, 'e4', sequentialIds('m'))

    expect(rep.nodes[rep.rootId]?.childIds).toEqual([])
    expect(Object.keys(rep.nodes)).toHaveLength(1)
  })

  it('rejects an illegal move', () => {
    const rep = createRepertoire('Test', 'white', sequentialIds())
    expect(() => addMove(rep, rep.rootId, 'e5', sequentialIds('m'))).toThrow()
  })

  it('rejects an unknown parent', () => {
    const rep = createRepertoire('Test', 'white', sequentialIds())
    expect(() => addMove(rep, 'missing', 'e4', sequentialIds('m'))).toThrow()
  })

  it('returns the existing child instead of duplicating the same move', () => {
    const rep = createRepertoire('Test', 'white', sequentialIds())
    const first = addMove(rep, rep.rootId, 'e4', sequentialIds('m'))
    const second = addMove(first.repertoire, rep.rootId, 'e4', sequentialIds('x'))

    expect(second.nodeId).toBe(first.nodeId)
    expect(second.repertoire.nodes[rep.rootId]?.childIds).toEqual([first.nodeId])
  })

  it('keeps sibling branches in insertion order', () => {
    const rep = createRepertoire('Test', 'white', sequentialIds())
    const a = addMove(rep, rep.rootId, 'e4', sequentialIds('a'))
    const b = addMove(a.repertoire, rep.rootId, 'd4', sequentialIds('b'))

    expect(getChildren(b.repertoire, rep.rootId).map((n) => n.san)).toEqual(['e4', 'd4'])
  })
})

describe('deleteNode', () => {
  it('removes the node, its whole subtree, and the link from its parent', () => {
    const rep = createRepertoire('Test', 'white', sequentialIds())
    const e4 = addMove(rep, rep.rootId, 'e4', sequentialIds('a'))
    const e5 = addMove(e4.repertoire, e4.nodeId, 'e5', sequentialIds('b'))
    const nf3 = addMove(e5.repertoire, e5.nodeId, 'Nf3', sequentialIds('c'))

    const after = deleteNode(nf3.repertoire, e4.nodeId)

    expect(after.nodes[e4.nodeId]).toBeUndefined()
    expect(after.nodes[e5.nodeId]).toBeUndefined()
    expect(after.nodes[nf3.nodeId]).toBeUndefined()
    expect(after.nodes[rep.rootId]?.childIds).toEqual([])
  })

  it('refuses to delete the root', () => {
    const rep = createRepertoire('Test', 'white', sequentialIds())
    expect(() => deleteNode(rep, rep.rootId)).toThrow()
  })

  it('throws for an unknown node', () => {
    const rep = createRepertoire('Test', 'white', sequentialIds())
    expect(() => deleteNode(rep, 'missing')).toThrow()
  })
})

describe('setComment', () => {
  it('stores a comment on a node', () => {
    const rep = createRepertoire('Test', 'white', sequentialIds())
    const { repertoire, nodeId } = addMove(rep, rep.rootId, 'e4', sequentialIds('m'))
    const updated = setComment(repertoire, nodeId, 'Main line')

    expect(updated.nodes[nodeId]?.comment).toBe('Main line')
    expect(repertoire.nodes[nodeId]?.comment).toBe('')
  })

  it('throws for an unknown node', () => {
    const rep = createRepertoire('Test', 'white', sequentialIds())
    expect(() => setComment(rep, 'missing', 'x')).toThrow()
  })
})

describe('getLine', () => {
  it('returns nodes from the root down to the given node', () => {
    const rep = createRepertoire('Test', 'white', sequentialIds())
    const e4 = addMove(rep, rep.rootId, 'e4', sequentialIds('a'))
    const e5 = addMove(e4.repertoire, e4.nodeId, 'e5', sequentialIds('b'))

    expect(getLine(e5.repertoire, e5.nodeId).map((n) => n.san)).toEqual([null, 'e4', 'e5'])
  })
})

describe('isUserTurn', () => {
  it('is true when the side to move matches the repertoire colour', () => {
    const rep = createRepertoire('Test', 'white', sequentialIds())
    const e4 = addMove(rep, rep.rootId, 'e4', sequentialIds('m'))

    expect(isUserTurn(rep, rep.rootId)).toBe(true)
    expect(isUserTurn(e4.repertoire, e4.nodeId)).toBe(false)
  })

  it('works for a black repertoire', () => {
    const rep = createRepertoire('Test', 'black', sequentialIds())
    const e4 = addMove(rep, rep.rootId, 'e4', sequentialIds('m'))

    expect(isUserTurn(rep, rep.rootId)).toBe(false)
    expect(isUserTurn(e4.repertoire, e4.nodeId)).toBe(true)
  })
})

describe('positionKey', () => {
  it('ignores halfmove and fullmove counters', () => {
    const a = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'
    const b = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 4 9'
    expect(positionKey(a)).toBe(positionKey(b))
  })

  it('distinguishes different side to move', () => {
    const white = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    const black = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1'
    expect(positionKey(white)).not.toBe(positionKey(black))
  })
})
