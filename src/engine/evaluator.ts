import { finalEvaluation } from '../domain/eval/final'
import {
  createEngineSession,
  type EngineSession,
  type EngineTransport,
  type EvalUpdate,
} from './session'

export type EvalState = { status: 'idle' } | EvalUpdate

export interface Evaluator {
  setFen(fen: string): void
  /** Calls the listener at once with the current state, then on every change. Returns an unsubscribe function. */
  subscribe(listener: (state: EvalState) => void): () => void
  dispose(): void
}

/**
 * Evaluates the latest position you give it. The engine is only created when a position
 * actually needs it, and quick changes are collapsed so only the last one is searched.
 */
export function createEvaluator(
  makeTransport: () => EngineTransport,
  options: { debounceMs?: number; depth?: number } = {},
): Evaluator {
  const debounceMs = options.debounceMs ?? 150
  const depth = options.depth ?? 14
  const listeners = new Set<(state: EvalState) => void>()
  let state: EvalState = { status: 'idle' }
  let session: EngineSession | null = null
  let timer: ReturnType<typeof setTimeout> | null = null
  let latestFen = ''
  let disposed = false

  function setState(next: EvalState) {
    state = next
    for (const listener of [...listeners]) listener(next)
  }

  function clearTimer() {
    if (timer !== null) clearTimeout(timer)
    timer = null
  }

  function run(fen: string) {
    timer = null
    if (disposed) return
    try {
      session ??= createEngineSession(makeTransport(), { depth })
    } catch (error) {
      setState({ status: 'error', message: error instanceof Error ? error.message : String(error) })
      return
    }
    session.evaluate(fen, (update) => {
      if (!disposed && fen === latestFen) setState(update)
    })
  }

  return {
    setFen(fen) {
      if (disposed) return
      clearTimer()
      latestFen = fen
      const final = finalEvaluation(fen)
      if (final) {
        // Over-the-board results need no engine, but a running search must still be told to stop.
        if (session) session.evaluate(fen, () => {})
        setState({ status: 'done', evaluation: final })
        return
      }
      setState({ status: 'thinking', evaluation: null })
      timer = setTimeout(() => run(fen), debounceMs)
    },
    subscribe(listener) {
      listeners.add(listener)
      listener(state)
      return () => {
        listeners.delete(listener)
      }
    },
    dispose() {
      disposed = true
      clearTimer()
      listeners.clear()
      session?.dispose()
      session = null
    },
  }
}
