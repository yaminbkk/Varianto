import { describe, expect, it } from 'vitest'
import { addMove, createRepertoire } from '../domain/repertoire/tree'
import type { MoveNode, Repertoire } from '../domain/repertoire/tree'
import { ImportError, exportRepertoires, parseRepertoires } from './exchange'

// Deterministic ids so tests can refer to nodes by name.
function sequentialIds(prefix = 'n') {
  let i = 0
  return () => `${prefix}${++i}`
}

// Ids: root `${p}1`, repertoire `${p}2`, then `${p}x` suffixed nodes below.
function branchedRepertoire(prefix: string): Repertoire {
  const start = createRepertoire('Open Games', 'white', sequentialIds(prefix))
  const e4 = addMove(start, start.rootId, 'e4', sequentialIds(`${prefix}a`))
  const e5 = addMove(e4.repertoire, e4.nodeId, 'e5', sequentialIds(`${prefix}b`))
  const nf3 = addMove(e5.repertoire, e5.nodeId, 'Nf3', sequentialIds(`${prefix}c`))
  const c5 = addMove(nf3.repertoire, e4.nodeId, 'c5', sequentialIds(`${prefix}d`))
  return c5.repertoire
}

interface ExportShape {
  format: string
  version: number
  exportedAt: string
  repertoires: Repertoire[]
}

function only(file: ExportShape): Repertoire {
  const rep = file.repertoires[0]
  if (!rep) throw new Error('fixture has no repertoire')
  return rep
}

function nodeOf(rep: Repertoire, id: string): MoveNode {
  const node = rep.nodes[id]
  if (!node) throw new Error(`fixture has no node ${id}`)
  return node
}

// Exports a valid repertoire, lets the test corrupt the parsed JSON, and
// returns the re-serialised text.
function corrupted(edit: (file: ExportShape) => void): string {
  const file = JSON.parse(exportRepertoires([branchedRepertoire('a')])) as ExportShape
  edit(file)
  return JSON.stringify(file)
}

describe('exportRepertoires / parseRepertoires', () => {
  it('round-trips repertoires', () => {
    const a = branchedRepertoire('a')
    const b = branchedRepertoire('b')

    expect(parseRepertoires(exportRepertoires([a, b]))).toEqual([a, b])
  })

  it('writes format, version and exportedAt', () => {
    const json = exportRepertoires([], () => new Date('2026-11-03T00:00:00.000Z'))
    const file = JSON.parse(json) as ExportShape

    expect(file.format).toBe('varianto-repertoires')
    expect(file.version).toBe(1)
    expect(file.exportedAt).toBe('2026-11-03T00:00:00.000Z')
  })

  it('accepts an empty list', () => {
    expect(parseRepertoires(exportRepertoires([]))).toEqual([])
  })

  it('does not mutate the input', () => {
    const rep = branchedRepertoire('a')
    const before = structuredClone(rep)

    parseRepertoires(exportRepertoires([rep]))

    expect(rep).toEqual(before)
  })
})

describe('parseRepertoires validation', () => {
  it('rejects text that is not JSON', () => {
    expect(() => parseRepertoires('not json')).toThrow(ImportError)
  })

  it('rejects a wrong format', () => {
    const json = corrupted((f) => {
      f.format = 'something-else'
    })
    expect(() => parseRepertoires(json)).toThrow(ImportError)
  })

  it('rejects an unsupported version', () => {
    const json = corrupted((f) => {
      f.version = 2
    })
    expect(() => parseRepertoires(json)).toThrow(ImportError)
  })

  it('rejects repertoires that is not an array', () => {
    const json = corrupted((f) => {
      ;(f as unknown as { repertoires: unknown }).repertoires = {}
    })
    expect(() => parseRepertoires(json)).toThrow(ImportError)
  })

  it('rejects an unknown colour', () => {
    const json = corrupted((f) => {
      ;(only(f) as unknown as { color: string }).color = 'red'
    })
    expect(() => parseRepertoires(json)).toThrow(ImportError)
  })

  it('rejects a rootId missing from nodes', () => {
    const json = corrupted((f) => {
      only(f).rootId = 'ghost'
    })
    expect(() => parseRepertoires(json)).toThrow(ImportError)
  })

  it('rejects a childIds entry pointing to a missing node', () => {
    const json = corrupted((f) => {
      const rep = only(f)
      nodeOf(rep, rep.rootId).childIds.push('ghost')
    })
    expect(() => parseRepertoires(json)).toThrow(ImportError)
  })

  it('rejects a parentId pointing to a missing node', () => {
    const json = corrupted((f) => {
      const rep = only(f)
      nodeOf(rep, 'aa1').parentId = 'ghost'
    })
    expect(() => parseRepertoires(json)).toThrow(ImportError)
  })

  it('rejects a child whose parentId does not match the node listing it', () => {
    const json = corrupted((f) => {
      // ab1 (e5) is a child of aa1 (e4); claim the root as its parent instead.
      nodeOf(only(f), 'ab1').parentId = 'a1'
    })
    expect(() => parseRepertoires(json)).toThrow(ImportError)
  })

  it('rejects a node unreachable from the root', () => {
    const json = corrupted((f) => {
      const rep = only(f)
      rep.nodes['orphan'] = {
        id: 'orphan',
        parentId: null,
        san: 'd4',
        fen: nodeOf(rep, rep.rootId).fen,
        comment: '',
        childIds: [],
      }
    })
    expect(() => parseRepertoires(json)).toThrow(ImportError)
  })

  it('rejects a root whose parentId points at a descendant', () => {
    const json = corrupted((f) => {
      const rep = only(f)
      nodeOf(rep, rep.rootId).parentId = 'aa1'
    })
    expect(() => parseRepertoires(json)).toThrow(ImportError)
  })

  it('rejects a root whose parentId is its own id', () => {
    const json = corrupted((f) => {
      const rep = only(f)
      nodeOf(rep, rep.rootId).parentId = rep.rootId
    })
    expect(() => parseRepertoires(json)).toThrow(ImportError)
  })

  it('rejects a cycle', () => {
    const json = corrupted((f) => {
      // The deepest node (Nf3) lists its ancestor e4 as a child.
      nodeOf(only(f), 'ac1').childIds.push('aa1')
    })
    expect(() => parseRepertoires(json)).toThrow(ImportError)
  })

  it('rejects the same repertoire id twice in one file', () => {
    const json = corrupted((f) => {
      f.repertoires.push(structuredClone(only(f)))
    })
    expect(() => parseRepertoires(json)).toThrow(ImportError)
  })
})
