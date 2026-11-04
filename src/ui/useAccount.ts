import { createContext, useContext } from 'react'
import type { Backends } from '../app/backends'
import type { AuthService, User } from '../auth/auth'

export interface Account {
  auth: AuthService
  backends: Backends
  /** The signed-in user, or undefined for a guest. */
  user: User | undefined
}

export const AccountContext = createContext<Account | null>(null)

export function useAccount(): Account {
  const account = useContext(AccountContext)
  if (!account) throw new Error('useAccount must be used inside AccountProvider')
  return account
}
