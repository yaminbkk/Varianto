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
  // Pins both the error class and the rule that fired.
  function expectRejected(json: string, fragment: string): void {
    expect(() => parseRepertoires(json)).toThrow(ImportError)
    expect(() => parseRepertoires(json)).toThrow(fragment)
  }

  // JSON.stringify of an object literal cannot produce an own "__proto__" key,
  // so these files are written as raw text.
  function protoFile(rootId: string, rootChildIds: string[], protoParentId: string | null): string {
    const node = (id: string, parentId: string | null, childIds: string[]) =>
      `{"id":"${id}","parentId":${parentId === null ? 'null' : `"${parentId}"`},"san":null,"fen":"f","comment":"","childIds":${JSON.stringify(childIds)}}`
    return (
      '{"format":"varianto-repertoires","version":1,"exportedAt":"x","repertoires":' +
      `[{"id":"r","name":"R","color":"white","rootId":"${rootId}","nodes":{` +
      `"root":${node('root', null, rootChildIds)},` +
      `"__proto__":${node('__proto__', protoParentId, [])}}}]}`
    )
  }

  it('rejects text that is not JSON', () => {
    expectRejected('not json', 'not valid JSON')
  })

  it('rejects a wrong format', () => {
    const json = corrupted((f) => {
      f.format = 'something-else'
    })
    expectRejected(json, 'Not a varianto-repertoires file')
  })

  it('rejects an unsupported version', () => {
    const json = corrupted((f) => {
      f.version = 2
    })
    expectRejected(json, 'Unsupported export version')
  })

  it('rejects repertoires that is not an array', () => {
    const json = corrupted((f) => {
      ;(f as unknown as { repertoires: unknown }).repertoires = {}
    })
    expectRejected(json, '"repertoires" must be an array')
  })

  it('rejects an unknown colour', () => {
    const json = corrupted((f) => {
      ;(only(f) as unknown as { color: string }).color = 'red'
    })
    expectRejected(json, 'invalid color')
  })

  it('rejects a rootId missing from nodes', () => {
    const json = corrupted((f) => {
      only(f).rootId = 'ghost'
    })
    expectRejected(json, 'rootId "ghost" is not in nodes')
  })

  it('rejects a rootId that is only an inherited property name', () => {
    const json = corrupted((f) => {
      only(f).rootId = 'toString'
    })
    expectRejected(json, 'rootId "toString" is not in nodes')
  })

  it('rejects a node keyed "__proto__" that the root lists as a child', () => {
    expectRejected(protoFile('root', ['__proto__'], 'root'), '"__proto__"')
  })

  it('rejects a rootId of "__proto__"', () => {
    expectRejected(protoFile('__proto__', [], null), '"__proto__"')
  })

  it('rejects a childIds entry pointing to a missing node', () => {
    const json = corrupted((f) => {
      const rep = only(f)
      nodeOf(rep, rep.rootId).childIds.push('ghost')
    })
    expectRejected(json, 'child "ghost" does not exist')
  })

  it('rejects a parentId pointing to a missing node', () => {
    const json = corrupted((f) => {
      const rep = only(f)
      nodeOf(rep, 'aa1').parentId = 'ghost'
    })
    expectRejected(json, 'parent "ghost" does not exist')
  })

  it('rejects a child whose parentId does not match the node listing it', () => {
    const json = corrupted((f) => {
      // ab1 (e5) is a child of aa1 (e4); claim the root as its parent instead.
      nodeOf(only(f), 'ab1').parentId = 'a1'
    })
    expectRejected(json, 'does not match "aa1"')
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
    expectRejected(json, 'not reachable from the root')
  })

  it('rejects a root whose parentId points at a descendant', () => {
    const json = corrupted((f) => {
      const rep = only(f)
      nodeOf(rep, rep.rootId).parentId = 'aa1'
    })
    expectRejected(json, 'root must have parentId null')
  })

  it('rejects a root whose parentId is its own id', () => {
    const json = corrupted((f) => {
      const rep = only(f)
      nodeOf(rep, rep.rootId).parentId = rep.rootId
    })
    expectRejected(json, 'root must have parentId null')
  })

  it('rejects a cycle', () => {
    const json = corrupted((f) => {
      // The deepest node (Nf3) lists its ancestor e4 as a child. e4's parentId
      // is the root, so the parent check fires before any node is visited twice.
      nodeOf(only(f), 'ac1').childIds.push('aa1')
    })
    expectRejected(json, 'node "aa1": parentId "a1" does not match "ac1"')
  })

  it('rejects a node listed twice by the same parent', () => {
    const json = corrupted((f) => {
      const rep = only(f)
      nodeOf(rep, rep.rootId).childIds.push('aa1')
    })
    expectRejected(json, 'node "aa1": reached twice')
  })

  it('rejects the same repertoire id twice in one file', () => {
    const json = corrupted((f) => {
      f.repertoires.push(structuredClone(only(f)))
    })
    expectRejected(json, 'Duplicate repertoire id')
  })
})
