import { createHashRouter, Outlet } from 'react-router-dom'
import type { StoreApi } from 'zustand'
import { homePath } from './paths'
import { StoreProvider } from './StoreContext'
import type { AppState } from './store/appStore'
import HomePage from './pages/HomePage'
import NotFoundPage from './pages/NotFoundPage'
import RepertoirePage from './pages/RepertoirePage'

// Must match repertoirePath(id) in ./paths.
const repertoireRoute = '/r/:id'

export function createAppRouter(store: StoreApi<AppState>) {
  return createHashRouter([
    {
      element: (
        <StoreProvider store={store}>
          <Outlet />
        </StoreProvider>
      ),
      children: [
        { path: homePath, element: <HomePage /> },
        { path: repertoireRoute, element: <RepertoirePage /> },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ])
}
