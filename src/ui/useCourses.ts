import { useCallback, useEffect, useState } from 'react'
import { coursesFrom, type Course } from '../domain/learn/courses'
import type { OpeningLine } from '../domain/openings/types'

export type CoursesState =
  | { status: 'loading' }
  | { status: 'failed'; retry: () => void }
  | { status: 'ready'; courses: Course[] }

/** Loads the opening library as its own chunk and groups it into courses. */
export function useCourses(): CoursesState {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<
    { status: 'loading' } | { status: 'failed' } | { status: 'ready'; courses: Course[] }
  >({ status: 'loading' })
  const retry = useCallback(() => {
    setState({ status: 'loading' })
    setAttempt((n) => n + 1)
  }, [])

  useEffect(() => {
    let alive = true
    import('../data/openings.json').then(
      (mod) => {
        if (alive) setState({ status: 'ready', courses: coursesFrom(mod.default as OpeningLine[]) })
      },
      () => {
        if (alive) setState({ status: 'failed' })
      },
    )
    return () => {
      alive = false
    }
  }, [attempt])

  return state.status === 'failed' ? { status: 'failed', retry } : state
}
