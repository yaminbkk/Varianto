import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { addMove, createRepertoire, deleteNode } from '../domain/repertoire/tree'
import { VariantoDb } from './db'
import { DexieRepertoireStore } from './dexieStore'

// Deterministic ids so tests can refer to nodes by name.
function sequentialIds(prefix = 'n') {
  let i = 0
  return () => `${prefix}${++i}`
}

// createRepertoire asks for the root id first, then the repertoire id.
function idsFor(repertoireId: string) {
  const queue = ['root', repertoireId]
  return () => queue.shift() ?? crypto.randomUUID()
}

function branchedRepertoire(repId = 'r', name = 'Open Games') {
  const start = createRepertoire(name, 'white', idsFor(repId))
  const e4 = addMove(start, start.rootId, 'e4', sequentialIds('a'))
  const e5 = addMove(e4.repertoire, e4.nodeId, 'e5', sequentialIds('b'))
  const nf3 = addMove(e5.repertoire, e5.nodeId, 'Nf3', sequentialIds('c'))
  const c5 = addMove(nf3.repertoire, e4.nodeId, 'c5', sequentialIds('d'))
  return { rep: c5.repertoire, e5Id: e5.nodeId, c5Id: c5.nodeId }
}

const openDbs: VariantoDb[] = []

function setup() {
  const db = new VariantoDb(`test-${crypto.randomUUID()}`)
  openDbs.push(db)
  return { db, store: new DexieRepertoireStore(db) }
}

afterEach(() => {
  for (const db of openDbs.splice(0)) db.close()
})

describe('DexieRepertoireStore', () => {
  it('saves and loads a repertoire', async () => {
    const { store } = setup()
    const { rep } = branchedRepertoire()

    await store.save(rep)

    expect(await store.load(rep.id)).toEqual(rep)
  })

  it('returns undefined for an unknown id', async () => {
    const { store } = setup()

    expect(await store.load('missing')).toBeUndefined()
  })

  it('lists summaries', async () => {
    const { store } = setup()
    const first = createRepertoire('Italian', 'white', idsFor('r1'))
    const second = createRepertoire('Sicilian', 'black', idsFor('r2'))

    await store.save(second)
    await store.save(first)

    const summaries = await store.list()
    expect([...summaries].sort((a, b) => a.id.localeCompare(b.id))).toEqual([
      { id: 'r1', name: 'Italian', color: 'white' },
      { id: 'r2', name: 'Sicilian', color: 'black' },
    ])
  })

  it('saving a pruned tree removes orphaned nodes', async () => {
    const { db, store } = setup()
    const { rep, e5Id } = branchedRepertoire()
    await store.save(rep)

    const pruned = deleteNode(rep, e5Id)
    await store.save(pruned)

    const count = await db.nodes.where('repertoireId').equals(rep.id).count()
    expect(count).toBe(Object.keys(pruned.nodes).length)
    expect(Object.keys(pruned.nodes).length).toBeLessThan(Object.keys(rep.nodes).length)
    expect(await store.load(rep.id)).toEqual(pruned)
  })

  it('keeps repertoires with colliding node ids separate', async () => {
    const { store } = setup()
    const firstStart = createRepertoire('First', 'white', idsFor('r1'))
    const first = addMove(firstStart, firstStart.rootId, 'e4', sequentialIds()).repertoire
    const secondStart = createRepertoire('Second', 'white', idsFor('r2'))
    const second = addMove(secondStart, secondStart.rootId, 'd4', sequentialIds()).repertoire
    expect(Object.keys(first.nodes)).toEqual(Object.keys(second.nodes))

    await store.save(first)
    await store.save(second)

    expect(await store.load(first.id)).toEqual(first)
    expect(await store.load(second.id)).toEqual(second)
  })

  it('removes a repertoire and its nodes', async () => {
    const { db, store } = setup()
    const { rep } = branchedRepertoire()
    await store.save(rep)

    await store.remove(rep.id)

    expect(await store.load(rep.id)).toBeUndefined()
    expect(await db.nodes.where('repertoireId').equals(rep.id).count()).toBe(0)
  })

  it('remove of an unknown id does not throw', async () => {
    const { store } = setup()

    await expect(store.remove('missing')).resolves.toBeUndefined()
  })

  it('saveMany then loadAll round-trips', async () => {
    const { store } = setup()
    const { rep: first } = branchedRepertoire('r1', 'One')
    const { rep: second } = branchedRepertoire('r2', 'Two')

    await store.saveMany([first, second])

    const all = await store.loadAll()
    expect([...all].sort((a, b) => a.id.localeCompare(b.id))).toEqual([first, second])
  })

  it('saveMany replaces a repertoire with the same id', async () => {
    const { db, store } = setup()
    const { rep, e5Id } = branchedRepertoire()
    await store.save(rep)
    const pruned = deleteNode(rep, e5Id)

    await store.saveMany([pruned])

    expect(await store.load(rep.id)).toEqual(pruned)
    expect(await db.nodes.where('repertoireId').equals(rep.id).count()).toBe(
      Object.keys(pruned.nodes).length,
    )
  })
})
