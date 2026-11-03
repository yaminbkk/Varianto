import { useCallback, useEffect, useState } from 'react'
import type { OpeningDescription } from '../domain/openings/describe'
import { keyIndex } from '../domain/openings/key'
import type { OpeningLine } from '../domain/openings/types'

export interface OpeningData {
  lines: OpeningLine[]
  index: Map<string, OpeningLine>
  keyOf: Map<OpeningLine, string>
  descriptions: Record<string, OpeningDescription>
}

export type OpeningDataState =
  | { status: 'loading' }
  | { status: 'failed'; retry: () => void }
  | { status: 'ready'; data: OpeningData }

/** Loads the opening library and descriptions as their own chunks. */
export function useOpeningData(): OpeningDataState {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<
    { status: 'loading' } | { status: 'failed' } | { status: 'ready'; data: OpeningData }
  >({ status: 'loading' })
  const retry = useCallback(() => {
    setState({ status: 'loading' })
    setAttempt((n) => n + 1)
  }, [])

  useEffect(() => {
    let alive = true
    Promise.all([
      import('../data/openings.json'),
      import('../data/opening-descriptions.json'),
    ]).then(
      ([library, descriptions]) => {
        if (!alive) return
        const lines = library.default as OpeningLine[]
        const index = keyIndex(lines)
        setState({
          status: 'ready',
          data: {
            lines,
            index,
            keyOf: new Map([...index].map(([key, line]) => [line, key])),
            descriptions: descriptions.default as Record<string, OpeningDescription>,
          },
        })
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
