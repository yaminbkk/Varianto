import { createContext, useContext } from 'react'
import { useStore, type StoreApi } from 'zustand'
import type { AppState } from './store/appStore'

export const StoreContext = createContext<StoreApi<AppState> | null>(null)

export function useAppStore<T>(selector: (s: AppState) => T): T {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useAppStore must be used inside StoreProvider')
  return useStore(store, selector)
}

/** Returns a function that reads the store's current state without subscribing to it. */
export function useStoreSnapshot(): () => AppState {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useStoreSnapshot must be used inside StoreProvider')
  return store.getState
}

/** The user-facing message for a failed action, taken from the state at that moment. */
export function failureMessage(s: Pick<AppState, 'error' | 'saveError'>): string | null {
  return s.saveError ? SAVE_ERROR_MESSAGE : s.error
}

export const SAVE_ERROR_MESSAGE = 'Changes are not saved. Check browser storage.'
