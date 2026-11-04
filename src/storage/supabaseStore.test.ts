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
    async fetchHeaders() {
      return [...items.values()].map((item) => ({ ...item.repertoire }))
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

  it('applies overlapping saves in call order, so the later state wins', async () => {
    const gateway = memoryGateway()
    const inner = gateway.saveMany
    let calls = 0
    // The first call is slow, like a request that takes the longer route.
    gateway.saveMany = async (list) => {
      const wait = calls++ === 0 ? 20 : 0
      await new Promise((resolve) => setTimeout(resolve, wait))
      return inner(list)
    }
    const store = new SupabaseRepertoireStore(gateway)
    const older = repertoire('r1', 'Older')
    const newer = repertoire('r1', 'Newer')

    await Promise.all([store.save(older), store.save(newer)])

    expect((await store.load('r1'))!.name).toBe('Newer')
  })

  it('keeps saving after one save fails, and reports the failure to its caller', async () => {
    const gateway = memoryGateway()
    const inner = gateway.saveMany
    let fail = true
    gateway.saveMany = async (list) => {
      if (fail) {
        fail = false
        throw new Error('network down')
      }
      return inner(list)
    }
    const store = new SupabaseRepertoireStore(gateway)

    const first = store.save(repertoire('r1', 'First'))
    const second = store.save(repertoire('r1', 'Second'))

    await expect(first).rejects.toThrow('network down')
    await second
    expect((await store.load('r1'))!.name).toBe('Second')
  })

  it('refuses to load a tree with missing nodes instead of handing out a truncated one', async () => {
    const gateway = memoryGateway()
    const store = new SupabaseRepertoireStore(gateway)
    const rep = repertoire()
    await store.save(rep)
    const item = gateway.items.get(rep.id)!
    item.nodes = item.nodes.slice(0, item.nodes.length - 1)

    await expect(store.load(rep.id)).rejects.toThrow(/incomplete/i)
    await expect(store.loadAll()).rejects.toThrow(/incomplete/i)
  })
})
