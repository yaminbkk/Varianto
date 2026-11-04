import { describe, expect, it, vi } from 'vitest'
import { createAuthService, type SupabaseLoader } from './auth'

type Listener = (event: string, session: { user: { id: string; email?: string } } | null) => void

function fakeSupabase(overrides: Record<string, unknown> = {}) {
  let listener: Listener | undefined
  const unsubscribe = vi.fn()
  const auth = {
    getSession: vi.fn(async () => ({ data: { session: null } })),
    signInWithPassword: vi.fn(async () => ({ error: null })),
    signUp: vi.fn(async () => ({ data: { session: null }, error: null })),
    signOut: vi.fn(async () => ({ error: null })),
    onAuthStateChange: vi.fn((cb: Listener) => {
      listener = cb
      return { data: { subscription: { unsubscribe } } }
    }),
    ...overrides,
  }
  const client = { auth }
  const createClient = vi.fn(() => client)
  const load: SupabaseLoader = vi.fn(async () => ({ createClient })) as unknown as SupabaseLoader
  return {
    auth,
    client,
    createClient,
    load,
    unsubscribe,
    emit: (...a: Parameters<Listener>) => listener?.(...a),
  }
}

const env = { url: 'https://x.supabase.co', anonKey: 'anon' }

describe('createAuthService', () => {
  it('is disabled without keys and never loads the Supabase library', async () => {
    const fake = fakeSupabase()
    const auth = createAuthService({}, fake.load)

    expect(auth.enabled).toBe(false)
    expect(await auth.currentUser()).toBeUndefined()
    const stop = auth.onChange(() => {})
    stop()
    await expect(auth.signIn('a@b.c', 'pw')).rejects.toThrow('not configured')
    expect(fake.load).not.toHaveBeenCalled()
  })

  it('loads the library only on first use and creates the client once', async () => {
    const fake = fakeSupabase()
    const auth = createAuthService(env, fake.load)
    expect(fake.load).not.toHaveBeenCalled()

    await auth.currentUser()
    await auth.currentUser()

    expect(fake.load).toHaveBeenCalledTimes(1)
    expect(fake.createClient).toHaveBeenCalledWith(env.url, env.anonKey)
  })

  it('returns the signed-in user of a restored session', async () => {
    const fake = fakeSupabase({
      getSession: vi.fn(async () => ({
        data: { session: { user: { id: 'u1', email: 'me@example.com' } } },
      })),
    })
    const auth = createAuthService(env, fake.load)

    expect(await auth.currentUser()).toEqual({ id: 'u1', email: 'me@example.com' })
  })

  it('signs in with the given credentials and surfaces the server message on failure', async () => {
    const fake = fakeSupabase()
    const auth = createAuthService(env, fake.load)
    await auth.signIn('me@example.com', 'secret')
    expect(fake.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'me@example.com',
      password: 'secret',
    })

    fake.auth.signInWithPassword.mockResolvedValueOnce({
      error: { message: 'Invalid login credentials' },
    } as never)
    await expect(auth.signIn('me@example.com', 'bad')).rejects.toThrow('Invalid login credentials')
  })

  it('reports whether sign-up needs email confirmation', async () => {
    const fake = fakeSupabase()
    const auth = createAuthService(env, fake.load)

    expect(await auth.signUp('me@example.com', 'secret')).toEqual({ needsConfirmation: true })

    fake.auth.signUp.mockResolvedValueOnce({
      data: { session: { user: { id: 'u1' } } },
      error: null,
    } as never)
    expect(await auth.signUp('me@example.com', 'secret')).toEqual({ needsConfirmation: false })
  })

  it('tells listeners about the user and stops after unsubscribe', async () => {
    const fake = fakeSupabase()
    const auth = createAuthService(env, fake.load)
    const seen: unknown[] = []

    const stop = auth.onChange((user) => seen.push(user))
    await vi.waitFor(() => expect(fake.auth.onAuthStateChange).toHaveBeenCalled())
    fake.emit('SIGNED_IN', { user: { id: 'u1', email: 'me@example.com' } })
    fake.emit('SIGNED_OUT', null)
    stop()

    expect(seen).toEqual([{ id: 'u1', email: 'me@example.com' }, undefined])
    expect(fake.unsubscribe).toHaveBeenCalled()
  })

  it('does not subscribe at all when unsubscribed before the library has loaded', async () => {
    const fake = fakeSupabase()
    const auth = createAuthService(env, fake.load)

    auth.onChange(() => {})()
    await auth.currentUser()

    expect(fake.auth.onAuthStateChange).not.toHaveBeenCalled()
  })
})
