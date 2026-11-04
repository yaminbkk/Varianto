import type { SupabaseClient } from '@supabase/supabase-js'

export interface User {
  id: string
  email: string
}

export interface AuthService {
  /** False when the build has no Supabase keys: the app then works as a guest only. */
  readonly enabled: boolean
  currentUser(): Promise<User | undefined>
  signIn(email: string, password: string): Promise<void>
  /** `needsConfirmation` is true when the user must confirm their email before signing in. */
  signUp(email: string, password: string): Promise<{ needsConfirmation: boolean }>
  signOut(): Promise<void>
  /** Calls the listener on every sign-in and sign-out. Returns a function that stops it. */
  onChange(listener: (user: User | undefined) => void): () => void
  /** The Supabase client, created on first use. Rejects when accounts are not configured. */
  client(): Promise<SupabaseClient>
}

export type SupabaseLoader = () => Promise<{
  createClient: (url: string, anonKey: string) => SupabaseClient
}>

/** Loads the library on demand so guests never download it. */
export const loadSupabase: SupabaseLoader = () => import('@supabase/supabase-js')

interface SessionLike {
  user: { id: string; email?: string }
}

function toUser(session: SessionLike | null | undefined): User | undefined {
  return session ? { id: session.user.id, email: session.user.email ?? '' } : undefined
}

export function createAuthService(
  env: { url?: string; anonKey?: string },
  load: SupabaseLoader = loadSupabase,
): AuthService {
  const { url, anonKey } = env
  const enabled = Boolean(url && anonKey)
  let clientPromise: Promise<SupabaseClient> | undefined

  const client = (): Promise<SupabaseClient> => {
    if (!url || !anonKey) return Promise.reject(new Error('Accounts are not configured'))
    clientPromise ??= load().then((lib) => lib.createClient(url, anonKey))
    return clientPromise
  }

  return {
    enabled,
    client,

    async currentUser() {
      if (!enabled) return undefined
      const { data } = await (await client()).auth.getSession()
      return toUser(data.session)
    },

    async signIn(email, password) {
      const { error } = await (await client()).auth.signInWithPassword({ email, password })
      if (error) throw new Error(error.message)
    },

    async signUp(email, password) {
      const { data, error } = await (await client()).auth.signUp({ email, password })
      if (error) throw new Error(error.message)
      return { needsConfirmation: data.session === null }
    },

    async signOut() {
      const { error } = await (await client()).auth.signOut()
      if (error) throw new Error(error.message)
    },

    onChange(listener) {
      if (!enabled) return () => {}
      let stopped = false
      let subscription: { unsubscribe(): void } | undefined
      void client().then((c) => {
        if (stopped) return
        subscription = c.auth.onAuthStateChange((_event, session) => {
          listener(toUser(session))
        }).data.subscription
      })
      return () => {
        stopped = true
        subscription?.unsubscribe()
      }
    },
  }
}
