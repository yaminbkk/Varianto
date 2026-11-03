import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { VariantoDb } from './db'
import { DexieProgressStore } from './dexieProgress'

const dbs: VariantoDb[] = []

function freshStore(name = `progress-${crypto.randomUUID()}`) {
  const db = new VariantoDb(name)
  dbs.push(db)
  return { db, store: new DexieProgressStore(db), name }
}

afterEach(async () => {
  for (const db of dbs.splice(0)) {
    db.close()
    await db.delete()
  }
})

describe('DexieProgressStore', () => {
  it('records a learned line once', async () => {
    const { store } = freshStore()
    await store.markLearned('italian-game', 'c50-italian-game')
    await store.markLearned('italian-game', 'c50-italian-game')
    expect([...(await store.learnedLines('italian-game'))]).toEqual(['c50-italian-game'])
  })

  it('keeps courses apart', async () => {
    const { store } = freshStore()
    await store.markLearned('italian-game', 'a')
    await store.markLearned('french-defense', 'b')
    expect([...(await store.learnedLines('french-defense'))]).toEqual(['b'])
    expect((await store.learnedLines('unknown')).size).toBe(0)
  })

  it('counts learned lines per course in one call', async () => {
    const { store } = freshStore()
    await store.markLearned('italian-game', 'a')
    await store.markLearned('italian-game', 'b')
    await store.markLearned('french-defense', 'c')
    expect(await store.learnedCounts()).toEqual(
      new Map([
        ['italian-game', 2],
        ['french-defense', 1],
      ]),
    )
  })

  it('resets only the given course', async () => {
    const { store } = freshStore()
    await store.markLearned('italian-game', 'a')
    await store.markLearned('french-defense', 'c')
    await store.reset('italian-game')
    expect((await store.learnedLines('italian-game')).size).toBe(0)
    expect((await store.learnedLines('french-defense')).size).toBe(1)
  })

  it('keeps repertoires when a version 1 database is upgraded', async () => {
    const name = `upgrade-${crypto.randomUUID()}`
    const old = new Dexie(name)
    old.version(1).stores({ repertoires: 'id', nodes: '[repertoireId+id], repertoireId' })
    await old.table('repertoires').put({ id: 'r1', name: 'Kept', color: 'white', rootId: 'root' })
    old.close()

    const { db, store } = freshStore(name)
    expect((await db.repertoires.get('r1'))?.name).toBe('Kept')
    await store.markLearned('c', 'k')
    expect((await store.learnedLines('c')).size).toBe(1)
  })
})
