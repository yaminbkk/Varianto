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
import LearnCatalogPage from './pages/LearnCatalogPage'
import CoursePage from './pages/CoursePage'
import LessonPage from './pages/LessonPage'

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
        { path: learnPath, element: <LearnCatalogPage /> },
        { path: courseRoute, element: <CoursePage /> },
        { path: lessonRoute, element: <LessonPage /> },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ])
}
