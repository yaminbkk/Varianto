import { createHashRouter, Outlet } from 'react-router-dom'
import type { StoreApi } from 'zustand'
import { homePath, openingsPath } from './paths'
import { StoreProvider } from './StoreContext'
import type { AppState } from './store/appStore'
import HomePage from './pages/HomePage'
import NotFoundPage from './pages/NotFoundPage'
import BoardPage from './pages/BoardPage'
import OpeningPage from './pages/OpeningPage'
import OpeningsPage from './pages/OpeningsPage'

// Must match repertoirePath(id) in ./paths.
const repertoireRoute = '/r/:id'
// Must match openingPath(key) in ./paths.
const openingRoute = `${openingsPath}/:key`

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
        { path: repertoireRoute, element: <BoardPage /> },
        { path: openingsPath, element: <OpeningsPage /> },
        { path: openingRoute, element: <OpeningPage /> },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ])
}
