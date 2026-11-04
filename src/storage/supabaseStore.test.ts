import { describe, expect, it } from 'vitest'
import { addMove, createRepertoire, deleteNode, type Repertoire } from '../domain/repertoire/tree'
import type { NodeRow, RepertoireRow } from './convert'
import { SupabaseRepertoireStore, type RepertoireGateway } from './supabaseStore'

type Item = { repertoire: RepertoireRow; nodes: NodeRow[] }

// Mirrors the save_repertoires function: replaces the repertoire and all of its nodes.
function memoryGateway(): RepertoireGateway & { items: Map<string, Item> } {
  const items = new Map<string, Item>()
  return {
    items,
    async saveMany(list) {
      for (const item of list) items.set(item.repertoire.id, structuredClone(item))
    },
    async fetch(id) {
      const item = items.get(id)
      return item ? structuredClone(item) : undefined
    },
    async fetchAll() {
      return structuredClone([...items.values()])
    },
    async remove(id) {
      items.delete(id)
    },
  }
}

function sequentialIds(prefix = 'n') {
  let i = 0
  return () => `${prefix}${++i}`
}

function repertoire(id = 'r1', name = 'Open Games'): Repertoire {
  const queue = ['root', id]
  const start = createRepertoire(name, 'white', () => queue.shift() ?? 'x')
  const e4 = addMove(start, start.rootId, 'e4', sequentialIds('a'))
  const e5 = addMove(e4.repertoire, e4.nodeId, 'e5', sequentialIds('b'))
  return addMove(e5.repertoire, e4.nodeId, 'c5', sequentialIds('c')).repertoire
}

describe('SupabaseRepertoireStore', () => {
  it('saves and loads a repertoire unchanged', async () => {
    const store = new SupabaseRepertoireStore(memoryGateway())
    const rep = repertoire()

    await store.save(rep)

    expect(await store.load(rep.id)).toEqual(rep)
  })

  it('returns undefined for an unknown id', async () => {
    const store = new SupabaseRepertoireStore(memoryGateway())

    expect(await store.load('missing')).toBeUndefined()
  })

  it('drops nodes that were pruned from the tree on the next save', async () => {
    const gateway = memoryGateway()
    const store = new SupabaseRepertoireStore(gateway)
    const rep = repertoire()
    await store.save(rep)
    const leafId = Object.values(rep.nodes).find((n) => n.san === 'e5')!.id

    const pruned = deleteNode(rep, leafId)
    await store.save(pruned)

    expect(await store.load(rep.id)).toEqual(pruned)
    expect(gateway.items.get(rep.id)!.nodes.some((n) => n.id === leafId)).toBe(false)
  })

  it('lists summaries and loads all repertoires', async () => {
    const store = new SupabaseRepertoireStore(memoryGateway())
    const first = repertoire('r1', 'Italian')
    const second = repertoire('r2', 'Sicilian')
    await store.saveMany([first, second])

    expect(await store.list()).toEqual([
      { id: 'r1', name: 'Italian', color: 'white' },
      { id: 'r2', name: 'Sicilian', color: 'white' },
    ])
    expect(await store.loadAll()).toEqual([first, second])
  })

  it('removes a repertoire and ignores unknown ids', async () => {
    const store = new SupabaseRepertoireStore(memoryGateway())
    const rep = repertoire()
    await store.save(rep)

    await store.remove(rep.id)
    await store.remove('missing')

    expect(await store.load(rep.id)).toBeUndefined()
  })

  it('does not mutate the repertoire it saves', async () => {
    const store = new SupabaseRepertoireStore(memoryGateway())
    const rep = repertoire()
    const copy = structuredClone(rep)

    await store.save(rep)

    expect(rep).toEqual(copy)
  })
})
