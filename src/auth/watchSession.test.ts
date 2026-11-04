import { describe, expect, it, vi } from 'vitest'
import type { User } from './auth'
import { watchSession } from './watchSession'

function fakeAuth() {
  let listener: ((user: User | undefined) => void) | undefined
  const stop = vi.fn()
  return {
    auth: {
      onChange(l: (user: User | undefined) => void) {
        listener = l
        return stop
      },
    },
    emit: (user: User | undefined) => listener?.(user),
    stop,
  }
}

const alice: User = { id: 'a', email: 'alice@example.com' }
const bob: User = { id: 'b', email: 'bob@example.com' }

describe('watchSession', () => {
  it('ignores events about the same user, such as token refreshes', () => {
    const { auth, emit } = fakeAuth()
    const changed = vi.fn()
    watchSession(auth, 'a', changed)

    emit(alice)

    expect(changed).not.toHaveBeenCalled()
  })

  it('reports another account signing in, for example from a second tab', () => {
    const { auth, emit } = fakeAuth()
    const changed = vi.fn()
    watchSession(auth, 'a', changed)

    emit(bob)

    expect(changed).toHaveBeenCalledTimes(1)
  })

  it('reports a sign-out', () => {
    const { auth, emit } = fakeAuth()
    const changed = vi.fn()
    watchSession(auth, 'a', changed)

    emit(undefined)

    expect(changed).toHaveBeenCalledTimes(1)
  })

  it('returns the function that stops listening', () => {
    const { auth, stop } = fakeAuth()
    watchSession(auth, 'a', () => {})()
    expect(stop).toHaveBeenCalled()
  })
})
