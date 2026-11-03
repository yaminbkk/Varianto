import { describe, expect, it } from 'vitest'
import { outlineRows } from './outline'
import { addMove, createRepertoire } from './tree'

describe('outlineRows', () => {
  it('lists the main line first, then variations one level deeper', () => {
    const start = createRepertoire('Test', 'white')
    const e4 = addMove(start, start.rootId, 'e4')
    const e5 = addMove(e4.repertoire, e4.nodeId, 'e5')
    const c5 = addMove(e5.repertoire, e4.nodeId, 'c5')

    expect(outlineRows(c5.repertoire)).toEqual([
      { nodeId: e4.nodeId, depth: 0, label: '1. e4' },
      { nodeId: e5.nodeId, depth: 0, label: '1... e5' },
      { nodeId: c5.nodeId, depth: 1, label: '1... c5' },
    ])
  })
})
