import type { ReactNode } from 'react'
import type { StoreApi } from 'zustand'
import type { AppState } from './store/appStore'
import { StoreContext } from './useAppStore'

export function StoreProvider({
  store,
  children,
}: {
  store: StoreApi<AppState>
  children: ReactNode
}) {
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}
