import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadEvalEnabled, saveEvalEnabled } from './evalPref'

function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('eval bar preference', () => {
  it('is off when nothing is stored', () => {
    vi.stubGlobal('window', { localStorage: fakeStorage() })
    expect(loadEvalEnabled()).toBe(false)
  })

  it('remembers on and off', () => {
    vi.stubGlobal('window', { localStorage: fakeStorage() })
    saveEvalEnabled(true)
    expect(loadEvalEnabled()).toBe(true)
    saveEvalEnabled(false)
    expect(loadEvalEnabled()).toBe(false)
  })

  it('only reads the stored value on as enabled', () => {
    vi.stubGlobal('window', { localStorage: fakeStorage({ 'varianto.evalbar': 'on' }) })
    expect(loadEvalEnabled()).toBe(true)
    vi.stubGlobal('window', { localStorage: fakeStorage({ 'varianto.evalbar': 'yes' }) })
    expect(loadEvalEnabled()).toBe(false)
  })

  it('is off and does not throw when storage is blocked', () => {
    const blocked = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    }
    vi.stubGlobal('window', { localStorage: blocked })
    expect(loadEvalEnabled()).toBe(false)
    expect(() => saveEvalEnabled(true)).not.toThrow()
  })

  it('is off when there is no window', () => {
    expect(loadEvalEnabled()).toBe(false)
  })
})
