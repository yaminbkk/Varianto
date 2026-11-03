import { useState } from 'react'
import { RouterProvider } from 'react-router-dom'
import type { StoreApi } from 'zustand'
import { createAppRouter } from './ui/router'
import type { ProgressStore } from './storage/progress'
import type { AppState } from './ui/store/appStore'

function App({ store, progress }: { store: StoreApi<AppState>; progress: ProgressStore }) {
  const [router] = useState(() => createAppRouter(store, progress))
  return <RouterProvider router={router} />
}

export default App
