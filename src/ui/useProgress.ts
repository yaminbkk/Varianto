import { createContext, useContext } from 'react'
import type { ProgressStore } from '../storage/progress'

export const ProgressContext = createContext<ProgressStore | null>(null)

export function useProgress(): ProgressStore {
  const progress = useContext(ProgressContext)
  if (!progress) throw new Error('useProgress must be used inside ProgressProvider')
  return progress
}
