import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { schedule } from '../domain/learn/review'
import { addMove, createRepertoire } from '../domain/repertoire/tree'
import { VariantoDb } from './db'
import { DexieProgressStore } from './dexieProgress'
import { DexieRepertoireStore } from './dexieStore'
import { copyLocalToAccount } from './migrate'

const dbs: VariantoDb[] = []

function stores() {
  const db = new VariantoDb(`migrate-${crypto.randomUUID()}`)
  dbs.push(db)
  return { repertoires: new DexieRepertoireStore(db), progress: new DexieProgressStore(db) }
}

afterEach(async () => {
  for (const db of dbs.splice(0)) {
    db.close()
    await db.delete()
  }
})

const card = schedule(null, 'good', new Date('2026-11-04T10:00:00Z'))
const drill = { passed: 3, failed: 1, durationMs: 60000, elapsedMs: 42000 }

async function seed(from: ReturnType<typeof stores>) {
  const ids = ['root', 'rep']
  const rep = addMove(createRepertoire('Mine', 'white', () => ids.shift() ?? 'x'), 'root', 'e4', () => 'n1')
  await from.repertoires.save(rep.repertoire)
  await from.progress.markLearned('italian-game', 'a')
  await from.progress.markLearned('italian-game', 'b')
  await from.progress.markLearned('french-defense', 'c')
  await from.progress.saveReview('italian-game', 'a', card)
  await from.progress.addDrillResult('italian-game', drill, 5000)
  return rep.repertoire
}

describe('copyLocalToAccount', () => {
  it('copies repertoires, learned lines, review cards and drills, and reports the counts', async () => {
    const from = stores()
    const to = stores()
    const rep = await seed(from)

    const summary = await copyLocalToAccount(from, to)

    expect(summary).toEqual({ repertoires: 1, lines: 3 })
    expect(await to.repertoires.loadAll()).toEqual([rep])
    expect([...(await to.progress.learnedLines('italian-game'))].sort()).toEqual(['a', 'b'])
    expect([...(await to.progress.learnedLines('french-defense'))]).toEqual(['c'])
    expect((await to.progress.reviewCards('italian-game')).get('a')).toEqual(card)
    expect(await to.progress.drillResults('italian-game')).toEqual([{ ...drill, at: 5000 }])
  })

  it('leaves the source untouched', async () => {
    const from = stores()
    const to = stores()
    const rep = await seed(from)

    await copyLocalToAccount(from, to)

    expect(await from.repertoires.loadAll()).toEqual([rep])
    expect((await from.progress.learnedCounts()).get('italian-game')).toBe(2)
  })

  it('does not duplicate anything when run twice', async () => {
    const from = stores()
    const to = stores()
    await seed(from)

    await copyLocalToAccount(from, to)
    await copyLocalToAccount(from, to)

    expect(await to.repertoires.list()).toHaveLength(1)
    expect((await to.progress.learnedLines('italian-game')).size).toBe(2)
    expect(await to.progress.drillResults('italian-game')).toHaveLength(1)
  })

  it('copies nothing from an empty source', async () => {
    const summary = await copyLocalToAccount(stores(), stores())
    expect(summary).toEqual({ repertoires: 0, lines: 0 })
  })
})
