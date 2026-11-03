import { useState } from 'react'
import { RouterProvider } from 'react-router-dom'
import type { StoreApi } from 'zustand'
import { createAppRouter } from './ui/router'
import type { AppState } from './ui/store/appStore'

function App({ store }: { store: StoreApi<AppState> }) {
  const [router] = useState(() => createAppRouter(store))
  return <RouterProvider router={router} />
}

export default App
