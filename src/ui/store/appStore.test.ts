import { describe, expect, it, vi } from 'vitest'
import type { OpeningLine } from '../../domain/openings/types'
import { createRepertoire, getNode, type Repertoire } from '../../domain/repertoire/tree'
import type { RepertoireStore } from '../../storage/store'
import { createAppStore } from './appStore'

function sequentialIds() {
  let i = 0
  return () => `id${++i}`
}

// Distinct from sequentialIds so seeded ids never collide with the app's ids.
function seedIds() {
  const queue = ['seed-root', 'seed-rep']
  return () => queue.shift() ?? 'seed-extra'
}

function memoryStore(options: { failSave?: boolean } = {}) {
  const data = new Map<string, Repertoire>()
  const store: RepertoireStore = {
    save: vi.fn(async (rep: Repertoire) => {
      if (options.failSave) throw new Error('disk full')
      data.set(rep.id, rep)
    }),
    saveMany: vi.fn(async (reps: Repertoire[]) => {
      for (const rep of reps) data.set(rep.id, rep)
    }),
    load: vi.fn(async (id: string) => data.get(id)),
    loadAll: vi.fn(async () => [...data.values()]),
    list: vi.fn(async () => [...data.values()].map(({ id, name, color }) => ({ id, name, color }))),
    remove: vi.fn(async (id: string) => {
      data.delete(id)
    }),
  }
  return { store, data }
}

function setup(options: { failSave?: boolean } = {}) {
  const { store, data } = memoryStore(options)
  const app = createAppStore({ store, newId: sequentialIds() })
  return { app, store, data }
}

async function openNew(app: ReturnType<typeof setup>['app']) {
  const id = await app.getState().create('Open Games', 'white')
  await app.getState().open(id)
  return id
}

describe('createAppStore', () => {
  it('lists a created repertoire', async () => {
    const { app } = setup()
    const id = await app.getState().create('Sicilian', 'black')
    await app.getState().loadList()
    expect(app.getState().summaries).toEqual([{ id, name: 'Sicilian', color: 'black' }])
  })

  it('stores a blank name as Untitled repertoire', async () => {
    const { app, data } = setup()
    const id = await app.getState().create('  ', 'white')
    expect(data.get(id)?.name).toBe('Untitled repertoire')
  })

  it('opens a repertoire and selects its root', async () => {
    const { app } = setup()
    const id = await openNew(app)
    const { current, selectedNodeId } = app.getState()
    expect(current?.id).toBe(id)
    expect(selectedNodeId).toBe(current?.rootId)
  })

  it('sets error when opening an unknown id', async () => {
    const { app } = setup()
    await app.getState().open('missing')
    expect(app.getState().current).toBeNull()
    expect(app.getState().error).not.toBeNull()
  })

  it('plays a move from the root, selects it and saves once', async () => {
    const { app, store } = setup()
    await openNew(app)
    vi.mocked(store.save).mockClear()

    await app.getState().playMove('e4')

    const { current, selectedNodeId } = app.getState()
    expect(selectedNodeId).not.toBeNull()
    expect(getNode(current!, selectedNodeId!).san).toBe('e4')
    expect(store.save).toHaveBeenCalledTimes(1)
    expect(app.getState().error).toBeNull()
  })

  it('rejects an illegal move without changing state or saving', async () => {
    const { app, store } = setup()
    await openNew(app)
    vi.mocked(store.save).mockClear()
    const before = app.getState()

    await app.getState().playMove('Ke5')

    expect(app.getState().current).toBe(before.current)
    expect(app.getState().selectedNodeId).toBe(before.selectedNodeId)
    expect(app.getState().error).not.toBeNull()
    expect(app.getState().saveError).toBe(false)
    expect(store.save).not.toHaveBeenCalled()
  })

  it('refuses to delete the root and keeps the tree', async () => {
    const { app, store } = setup()
    await openNew(app)
    vi.mocked(store.save).mockClear()
    const before = app.getState().current

    await app.getState().deleteSelected()

    expect(app.getState().current).toBe(before)
    expect(app.getState().error).not.toBeNull()
    expect(store.save).not.toHaveBeenCalled()
  })

  it('deletes the selected node and selects the root', async () => {
    const { app } = setup()
    await openNew(app)
    await app.getState().playMove('e4')
    const e4Id = app.getState().selectedNodeId!

    await app.getState().deleteSelected()

    const { current, selectedNodeId } = app.getState()
    expect(current?.nodes[e4Id]).toBeUndefined()
    expect(selectedNodeId).toBe(current?.rootId)
  })

  it('sets a comment on the selected node and saves', async () => {
    const { app, store, data } = setup()
    const id = await openNew(app)
    await app.getState().playMove('e4')
    const e4Id = app.getState().selectedNodeId!
    vi.mocked(store.save).mockClear()

    await app.getState().setComment('Main line')

    expect(getNode(app.getState().current!, e4Id).comment).toBe('Main line')
    expect(store.save).toHaveBeenCalledTimes(1)
    expect(getNode(data.get(id)!, e4Id).comment).toBe('Main line')
  })

  it('renames and recolours the current repertoire', async () => {
    const { app, data } = setup()
    const id = await openNew(app)

    await app.getState().rename('  Italian  ')
    await app.getState().setColor('black')

    expect(app.getState().current).toMatchObject({ name: 'Italian', color: 'black' })
    expect(data.get(id)).toMatchObject({ name: 'Italian', color: 'black' })
  })

  it('imports a PGN into a new repertoire', async () => {
    const { app, data } = setup()
    const id = await app.getState().importPgn('1. e4 e5 2. Nf3 *', 'Imported', 'white')
    const rep = data.get(id)!
    expect(rep.name).toBe('Imported')
    expect(Object.keys(rep.nodes)).toHaveLength(4)
  })

  it('returns an empty id and creates nothing for invalid PGN', async () => {
    const { app, store } = setup()

    const id = await app.getState().importPgn('garbage (((', 'x', 'white')
    await app.getState().loadList()

    expect(id).toBe('')
    expect(app.getState().error).not.toBeNull()
    expect(app.getState().summaries).toEqual([])
    expect(store.save).not.toHaveBeenCalled()
  })

  it('creates a repertoire named after a valid opening line', async () => {
    const { app, data } = setup()
    const line: OpeningLine = { eco: 'C20', name: "King's Pawn Game", pgn: '1. e4 e5' }

    const id = await app.getState().fromOpening(line, 'white')

    expect(data.get(id)?.name).toBe("King's Pawn Game")
  })

  it('returns an empty id and creates nothing for an invalid opening line', async () => {
    const { app, store } = setup()
    const line: OpeningLine = { eco: 'A00', name: 'Broken', pgn: '1. Ke5' }

    const id = await app.getState().fromOpening(line, 'white')

    expect(id).toBe('')
    expect(app.getState().error).not.toBeNull()
    expect(store.save).not.toHaveBeenCalled()
  })

  it('keeps the move in memory and sets saveError when save rejects', async () => {
    const { app, data } = setup({ failSave: true })
    const seeded = createRepertoire('Seed', 'white', seedIds())
    data.set(seeded.id, seeded)
    await app.getState().open(seeded.id)

    await app.getState().playMove('e4')

    const { current, selectedNodeId, error, saveError } = app.getState()
    expect(getNode(current!, selectedNodeId!).san).toBe('e4')
    expect(saveError).toBe(true)
    expect(error).toBeNull()
  })

  it('clears saveError after the next successful write', async () => {
    const { store, data } = memoryStore()
    const app = createAppStore({ store, newId: sequentialIds() })
    const id = await openNew(app)
    vi.mocked(store.save).mockRejectedValueOnce(new Error('disk full'))
    await app.getState().playMove('e4')
    expect(app.getState().saveError).toBe(true)

    await app.getState().setComment('ok')

    expect(app.getState().saveError).toBe(false)
    expect(data.get(id)).toBeDefined()
  })

  it('removes a repertoire from the list', async () => {
    const { app } = setup()
    const id = await app.getState().create('Gone', 'white')
    await app.getState().loadList()

    await app.getState().remove(id)

    expect(app.getState().summaries).toEqual([])
  })
})
