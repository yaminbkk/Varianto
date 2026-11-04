import { useState } from 'react'
import { RouterProvider } from 'react-router-dom'
import type { StoreApi } from 'zustand'
import { createAppRouter } from './ui/router'
import type { ProgressStore } from './storage/progress'
import type { AppState } from './ui/store/appStore'
import type { Account } from './ui/useAccount'

function App({
  store,
  progress,
  account,
}: {
  store: StoreApi<AppState>
  progress: ProgressStore
  account: Account
}) {
  const [router] = useState(() => createAppRouter(store, progress, account))
  return <RouterProvider router={router} />
}

export default App
