import { createHashRouter, Outlet } from 'react-router-dom'
import type { StoreApi } from 'zustand'
import { accountPath, homePath, learnPath, openingsPath } from './paths'
import type { ProgressStore } from '../storage/progress'
import { ProgressProvider } from './ProgressContext'
import { AccountProvider } from './AccountProvider'
import { StoreProvider } from './StoreContext'
import type { Account } from './useAccount'
import type { AppState } from './store/appStore'
import HomePage from './pages/HomePage'
import AppHeader from './AppHeader'
import ErrorPage from './pages/ErrorPage'
import NotFoundPage from './pages/NotFoundPage'
import BoardPage from './pages/BoardPage'
import OpeningPage from './pages/OpeningPage'
import OpeningsPage from './pages/OpeningsPage'

const repertoireRoute = '/r/:id'
const openingRoute = `${openingsPath}/:key`
const courseRoute = `${learnPath}/:courseId`
const lessonRoute = `${learnPath}/:courseId/play`
const practiceRoute = `${learnPath}/:courseId/practice`
const drillRoute = `${learnPath}/:courseId/drill`

export function createAppRouter(
  store: StoreApi<AppState>,
  progress: ProgressStore,
  account: Account,
) {
  return createHashRouter([
    {
      errorElement: <ErrorPage />,
      element: (
        <AccountProvider account={account}>
          <StoreProvider store={store}>
            <ProgressProvider progress={progress}>
              <AppHeader />
              <Outlet />
            </ProgressProvider>
          </StoreProvider>
        </AccountProvider>
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
        {
          path: practiceRoute,
          lazy: async () => ({ Component: (await import('./pages/PracticePage')).default }),
        },
        {
          path: drillRoute,
          lazy: async () => ({ Component: (await import('./pages/DrillPage')).default }),
        },
        {
          path: accountPath,
          lazy: async () => ({ Component: (await import('./pages/AccountPage')).default }),
        },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ])
}
