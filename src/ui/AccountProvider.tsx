import type { ReactNode } from 'react'
import { AccountContext, type Account } from './useAccount'

export function AccountProvider({ account, children }: { account: Account; children: ReactNode }) {
  return <AccountContext.Provider value={account}>{children}</AccountContext.Provider>
}
