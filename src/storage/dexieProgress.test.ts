import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { schedule } from '../domain/learn/review'
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

  it('keeps learned lines when a version 2 database is upgraded', async () => {
    const name = `upgrade2-${crypto.randomUUID()}`
    const old = new Dexie(name)
    old.version(1).stores({ repertoires: 'id', nodes: '[repertoireId+id], repertoireId' })
    old.version(2).stores({ learned: '[courseId+lineKey], courseId' })
    await old.table('learned').put({ courseId: 'c', lineKey: 'k' })
    old.close()

    const { store } = freshStore(name)
    expect([...(await store.learnedLines('c'))]).toEqual(['k'])
    expect((await store.reviewCards('c')).size).toBe(0)
  })
})

describe('DexieProgressStore reviews', () => {
  const now = new Date('2026-11-03T12:00:00Z')

  it('round-trips a card with its due date', async () => {
    const { store } = freshStore()
    const card = schedule(null, 'good', now)
    await store.saveReview('c', 'a', card)
    const saved = (await store.reviewCards('c')).get('a')
    expect(saved?.due).toBeInstanceOf(Date)
    expect(saved?.due.getTime()).toBe(card.due.getTime())
  })

  it('keeps one card per line when saved twice', async () => {
    const { store } = freshStore()
    await store.saveReview('c', 'a', schedule(null, 'again', now))
    const later = schedule(null, 'good', now)
    await store.saveReview('c', 'a', later)
    const cards = await store.reviewCards('c')
    expect(cards.size).toBe(1)
    expect(cards.get('a')?.due.getTime()).toBe(later.due.getTime())
  })

  it('keeps courses apart', async () => {
    const { store } = freshStore()
    await store.saveReview('c1', 'a', schedule(null, 'good', now))
    expect((await store.reviewCards('c2')).size).toBe(0)
  })
})

describe('DexieProgressStore drills', () => {
  const result = { passed: 3, failed: 1, durationMs: 60_000, elapsedMs: 42_000 }
  const now = new Date('2026-11-03T12:00:00Z')

  it('lists drill results newest first', async () => {
    const { store } = freshStore()
    await store.addDrillResult('c', { ...result, passed: 1 }, 1000)
    await store.addDrillResult('c', { ...result, passed: 5 }, 3000)
    await store.addDrillResult('c', { ...result, passed: 2 }, 2000)
    const saved = await store.drillResults('c')
    expect(saved.map((r) => r.passed)).toEqual([5, 2, 1])
    expect(saved[0]).toEqual({ ...result, passed: 5, at: 3000 })
  })

  it('keeps courses apart', async () => {
    const { store } = freshStore()
    await store.addDrillResult('c1', result, 1000)
    expect(await store.drillResults('c2')).toEqual([])
  })

  it('is cleared with the rest of the course by reset', async () => {
    const { store } = freshStore()
    await store.markLearned('c', 'a')
    await store.saveReview('c', 'a', schedule(null, 'good', now))
    await store.addDrillResult('c', result, 1000)
    await store.reset('c')
    expect((await store.reviewCards('c')).size).toBe(0)
    expect(await store.drillResults('c')).toEqual([])
  })
})
