import type { AuthService } from '../auth/auth'
import type { Backend } from '../storage/migrate'
import { createSupabaseBackend } from '../storage/supabaseGateways'
import { SwitchableProgressStore, SwitchableRepertoireStore } from '../storage/switchable'

/**
 * The stores the app talks to. They start on the guest's local backend; useAccount() moves
 * them to the signed-in user's Supabase account and useGuest() moves them back. Guest data is
 * never deleted by either.
 */
export interface Backends {
  /** What the app reads and writes through. */
  current: Backend
  /** The guest's browser storage, kept for copying into an account. */
  local: Backend
  useAccount(): Promise<Backend>
  useGuest(): void
}

export function createBackends(local: Backend, auth: AuthService): Backends {
  const repertoires = new SwitchableRepertoireStore(local.repertoires)
  const progress = new SwitchableProgressStore(local.progress)
  return {
    current: { repertoires, progress },
    local,
    async useAccount() {
      const account = createSupabaseBackend(await auth.client())
      repertoires.use(account.repertoires)
      progress.use(account.progress)
      return account
    },
    useGuest() {
      repertoires.use(local.repertoires)
      progress.use(local.progress)
    },
  }
}
