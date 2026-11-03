import { createContext, useContext, type ReactNode } from 'react'
import { useStore, type StoreApi } from 'zustand'
import type { AppState } from './store/appStore'

const StoreContext = createContext<StoreApi<AppState> | null>(null)

export function StoreProvider({
  store,
  children,
}: {
  store: StoreApi<AppState>
  children: ReactNode
}) {
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}

export function useAppStore<T>(selector: (s: AppState) => T): T {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useAppStore must be used inside StoreProvider')
  return useStore(store, selector)
}
