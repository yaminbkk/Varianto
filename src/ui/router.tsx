import { createHashRouter, Outlet } from 'react-router-dom'
import type { StoreApi } from 'zustand'
import { homePath, learnPath, openingsPath } from './paths'
import type { ProgressStore } from '../storage/progress'
import { ProgressProvider } from './ProgressContext'
import { StoreProvider } from './StoreContext'
import type { AppState } from './store/appStore'
import HomePage from './pages/HomePage'
import NotFoundPage from './pages/NotFoundPage'
import BoardPage from './pages/BoardPage'
import OpeningPage from './pages/OpeningPage'
import OpeningsPage from './pages/OpeningsPage'

const repertoireRoute = '/r/:id'
const openingRoute = `${openingsPath}/:key`
const courseRoute = `${learnPath}/:courseId`
const lessonRoute = `${learnPath}/:courseId/play`

export function createAppRouter(store: StoreApi<AppState>, progress: ProgressStore) {
  return createHashRouter([
    {
      element: (
        <StoreProvider store={store}>
          <ProgressProvider progress={progress}>
            <Outlet />
          </ProgressProvider>
        </StoreProvider>
      ),
      children: [
        { path: homePath, element: <HomePage /> },
        { path: repertoireRoute, element: <BoardPage /> },
        { path: openingsPath, element: <OpeningsPage /> },
        { path: openingRoute, element: <OpeningPage /> },
        {
          path: learnPath,
          lazy: async () => ({ Component: (await import('./pages/LearnCatalogPage')).default }),
        },
        {
          path: courseRoute,
          lazy: async () => ({ Component: (await import('./pages/CoursePage')).default }),
        },
        {
          path: lessonRoute,
          lazy: async () => ({ Component: (await import('./pages/LessonPage')).default }),
        },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ])
}
