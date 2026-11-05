import { finalEvaluation } from '../domain/eval/final'
import type { Evaluation } from '../domain/eval/types'
import { parseInfoLine } from '../domain/eval/uci'

/** A two-way line to a UCI engine. The real one is a Web Worker; tests use a fake. */
export interface EngineTransport {
  post(command: string): void
  onMessage(handler: (line: string) => void): void
  onError(handler: (message: string) => void): void
  terminate(): void
}

export type EvalUpdate =
  | { status: 'thinking'; evaluation: Evaluation | null }
  | { status: 'done'; evaluation: Evaluation }
  | { status: 'error'; message: string }

export interface EngineSession {
  /** Supersedes any earlier request; only the latest request's updates are delivered. */
  evaluate(fen: string, onUpdate: (update: EvalUpdate) => void): void
  dispose(): void
}

interface Request {
  fen: string
  onUpdate: (update: EvalUpdate) => void
  /** Set once a newer request has replaced this one: nothing more is delivered. */
  dropped: boolean
  last: Evaluation | null
}

type State = 'booting' | 'idle' | 'searching' | 'stopping'

export function createEngineSession(
  transport: EngineTransport,
  options: { depth?: number; hashMb?: number } = {},
): EngineSession {
  const depth = options.depth ?? 14
  const hashMb = options.hashMb ?? 16
  const cache = new Map<string, Evaluation>()
  let state: State = 'booting'
  let current: Request | null = null
  let queued: Request | null = null
  let failure: string | null = null
  let disposed = false

  /** Ask the running search to end; its output is ignored from now on. */
  function stopCurrent() {
    if (state !== 'searching' || !current) return
    current.dropped = true
    transport.post('stop')
    state = 'stopping'
  }

  function supersedeQueued() {
    if (queued) queued.dropped = true
    queued = null
  }

  function pump() {
    if (queued && state === 'searching') stopCurrent()
    if (queued && state === 'idle') {
      current = queued
      queued = null
      transport.post(`position fen ${current.fen}`)
      transport.post(`go depth ${depth}`)
      state = 'searching'
    }
  }

  function fail(message: string) {
    failure = message
    for (const request of [current, queued]) {
      if (request && !request.dropped) request.onUpdate({ status: 'error', message })
    }
  }

  transport.onError((message) => {
    if (!disposed) fail(message)
  })

  transport.onMessage((line) => {
    if (disposed) return
    if (line === 'uciok' && state === 'booting') {
      transport.post(`setoption name Hash value ${hashMb}`)
      transport.post('isready')
    } else if (line === 'readyok' && state === 'booting') {
      state = 'idle'
      pump()
    } else if (line.startsWith('bestmove')) {
      if (state === 'searching' && current && !current.dropped) {
        const finished = current
        if (finished.last) {
          cache.set(finished.fen, finished.last)
          finished.onUpdate({ status: 'done', evaluation: finished.last })
        } else {
          finished.onUpdate({ status: 'error', message: 'The engine gave no evaluation' })
        }
      }
      if (state === 'searching' || state === 'stopping') {
        current = null
        state = 'idle'
        pump()
      }
    } else if (state === 'searching' && current && !current.dropped) {
      const evaluation = parseInfoLine(line, current.fen)
      if (evaluation) {
        current.last = evaluation
        current.onUpdate({ status: 'thinking', evaluation })
      }
    }
  })

  transport.post('uci')

  return {
    evaluate(fen, onUpdate) {
      if (disposed) return
      if (failure) {
        onUpdate({ status: 'error', message: failure })
        return
      }
      supersedeQueued()
      const known = finalEvaluation(fen) ?? cache.get(fen)
      if (known) {
        stopCurrent()
        if (current) current.dropped = true
        onUpdate({ status: 'done', evaluation: known })
        return
      }
      onUpdate({ status: 'thinking', evaluation: null })
      queued = { fen, onUpdate, dropped: false, last: null }
      pump()
    },
    dispose() {
      disposed = true
      transport.terminate()
    },
  }
}
