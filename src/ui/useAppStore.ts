import { createContext, useContext } from 'react'
import { useStore, type StoreApi } from 'zustand'
import type { AppState } from './store/appStore'

export const StoreContext = createContext<StoreApi<AppState> | null>(null)

export function useAppStore<T>(selector: (s: AppState) => T): T {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useAppStore must be used inside StoreProvider')
  return useStore(store, selector)
}
