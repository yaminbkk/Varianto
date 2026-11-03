import type { ReactNode } from 'react'
import type { ProgressStore } from '../storage/progress'
import { ProgressContext } from './useProgress'

export function ProgressProvider({
  progress,
  children,
}: {
  progress: ProgressStore
  children: ReactNode
}) {
  return <ProgressContext.Provider value={progress}>{children}</ProgressContext.Provider>
}
