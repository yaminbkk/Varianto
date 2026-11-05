import { describe, expect, it } from 'vitest'
import { createRepertoire } from '../domain/repertoire/tree'
import type { ProgressStore } from './progress'
import { SwitchableProgressStore, SwitchableRepertoireStore } from './switchable'
import type { RepertoireStore } from './store'

function recordingRepertoireStore(name: string, log: string[], gate?: Promise<void>) {
  const store: RepertoireStore = {
    async save(rep) {
      if (gate) await gate
      log.push(`${name}:save:${rep.id}`)
    },
    async saveMany() {},
    async load() {
      log.push(`${name}:load`)
      return undefined
    },
    async loadAll() {
      return []
    },
    async list() {
      log.push(`${name}:list`)
      return []
    },
    async remove() {},
  }
  return store
}

function recordingProgressStore(name: string, log: string[]): ProgressStore {
  return {
    async markLearned(courseId, lineKey) {
      log.push(`${name}:learned:${courseId}:${lineKey}`)
    },
    async learnedLines() {
      return new Set()
    },
    async learnedCounts() {
      return new Map()
    },
    async reset() {},
    async reviewCards() {
      return new Map()
    },
    async saveReview() {},
    async addDrillResult() {},
    async drillResults() {
      return []
    },
    async recordActivity(day) {
      log.push(`${name}:activity:${day}`)
    },
    async activityDays() {
      return []
    },
  }
}

describe('SwitchableRepertoireStore', () => {
  it('sends calls to the current backend and to the new one after use()', async () => {
    const log: string[] = []
    const store = new SwitchableRepertoireStore(recordingRepertoireStore('local', log))

    await store.list()
    store.use(recordingRepertoireStore('remote', log))
    await store.list()

    expect(log).toEqual(['local:list', 'remote:list'])
  })

  it('finishes a call on the backend it started on when the backend changes meanwhile', async () => {
    const log: string[] = []
    let release!: () => void
    const gate = new Promise<void>((resolve) => (release = resolve))
    const store = new SwitchableRepertoireStore(recordingRepertoireStore('local', log, gate))
    const rep = createRepertoire('x', 'white', () => 'id')

    const pending = store.save(rep)
    store.use(recordingRepertoireStore('remote', log))
    release()
    await pending

    expect(log).toEqual(['local:save:id'])
  })
})

describe('SwitchableProgressStore', () => {
  it('sends calls to the current backend and to the new one after use()', async () => {
    const log: string[] = []
    const store = new SwitchableProgressStore(recordingProgressStore('local', log))

    await store.markLearned('c', 'a')
    store.use(recordingProgressStore('remote', log))
    await store.markLearned('c', 'b')
    await store.recordActivity('2026-11-05')

    expect(log).toEqual(['local:learned:c:a', 'remote:learned:c:b', 'remote:activity:2026-11-05'])
  })
})
