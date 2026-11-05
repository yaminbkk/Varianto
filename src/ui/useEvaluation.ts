import { useEffect, useRef, useState } from 'react'
import type { Evaluation } from '../domain/eval/types'
import { createEvaluator, type EvalState, type Evaluator } from '../engine/evaluator'
import { createStockfishTransport } from '../engine/stockfishTransport'

export interface EvalView {
  state: EvalState
  /** The latest evaluation we have, which may be for the previous position while the engine thinks. */
  evaluation: Evaluation | null
}

const OFF: EvalView = { state: { status: 'idle' }, evaluation: null }

/**
 * Evaluates `fen` with Stockfish while `enabled`. The engine is only created (and its files only
 * downloaded) when `enabled` becomes true, and is shut down when it becomes false.
 */
export function useEvaluation(fen: string, enabled: boolean): EvalView {
  const [view, setView] = useState<EvalView>(OFF)
  const evaluatorRef = useRef<Evaluator | null>(null)

  useEffect(() => {
    if (!enabled) return
    const evaluator = createEvaluator(() => createStockfishTransport(import.meta.env.BASE_URL))
    evaluatorRef.current = evaluator
    const unsubscribe = evaluator.subscribe((state) =>
      setView((previous) => ({
        state,
        evaluation:
          state.status === 'idle' || state.status === 'error'
            ? null
            : (state.evaluation ?? previous.evaluation),
      })),
    )
    return () => {
      unsubscribe()
      evaluator.dispose()
      evaluatorRef.current = null
    }
  }, [enabled])

  useEffect(() => {
    if (enabled && fen) evaluatorRef.current?.setFen(fen)
  }, [fen, enabled])

  return enabled ? view : OFF
}
