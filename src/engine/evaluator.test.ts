import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FakeTransport } from './fakeTransport'
import { createEvaluator, type EvalState } from './evaluator'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'
const FOOLS_MATE = 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3'

function setup() {
  const transport = new FakeTransport()
  const makeTransport = vi.fn(() => transport)
  const evaluator = createEvaluator(makeTransport)
  const states: EvalState[] = []
  evaluator.subscribe((s) => states.push(s))
  return { transport, makeTransport, evaluator, states }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('createEvaluator', () => {
  it('starts idle and does not touch the engine', () => {
    const { makeTransport, states } = setup()
    expect(states).toEqual([{ status: 'idle' }])
    expect(makeTransport).not.toHaveBeenCalled()
  })

  it('answers a finished game at once without creating the engine', () => {
    const { makeTransport, evaluator, states } = setup()
    evaluator.setFen(FOOLS_MATE)
    expect(states.at(-1)).toEqual({
      status: 'done',
      evaluation: { kind: 'final', result: 'black' },
    })
    vi.advanceTimersByTime(1000)
    expect(makeTransport).not.toHaveBeenCalled()
  })

  it('waits for the debounce before it creates the engine', () => {
    const { makeTransport, evaluator, states } = setup()
    evaluator.setFen(START)
    expect(states.at(-1)).toEqual({ status: 'thinking', evaluation: null })
    vi.advanceTimersByTime(149)
    expect(makeTransport).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(makeTransport).toHaveBeenCalledTimes(1)
  })

  it('evaluates only the last of several quick changes', () => {
    const { transport, evaluator, states } = setup()
    evaluator.setFen(START)
    vi.advanceTimersByTime(100)
    evaluator.setFen(AFTER_E4)
    vi.advanceTimersByTime(150)
    transport.emit('uciok')
    transport.emit('readyok')
    expect(transport.sent).toContain(`position fen ${AFTER_E4}`)
    expect(transport.sent).not.toContain(`position fen ${START}`)
    transport.emit('info depth 14 score cp 30 pv e7e5')
    transport.emit('bestmove e7e5')
    expect(states.at(-1)).toEqual({
      status: 'done',
      evaluation: { kind: 'cp', value: -30, depth: 14 },
    })
  })

  it('reports an error when the engine cannot be created', () => {
    const evaluator = createEvaluator(() => {
      throw new Error('WebAssembly is not supported in this browser')
    })
    const states: EvalState[] = []
    evaluator.subscribe((s) => states.push(s))
    evaluator.setFen(START)
    expect(() => vi.advanceTimersByTime(150)).not.toThrow()
    expect(states.at(-1)).toEqual({
      status: 'error',
      message: 'WebAssembly is not supported in this browser',
    })
  })

  it('stops everything on dispose', () => {
    const { transport, makeTransport, evaluator } = setup()
    evaluator.setFen(START)
    vi.advanceTimersByTime(150)
    evaluator.dispose()
    expect(transport.terminated).toBe(true)

    evaluator.setFen(AFTER_E4)
    vi.advanceTimersByTime(1000)
    expect(makeTransport).toHaveBeenCalledTimes(1)
  })

  it('cancels a pending evaluation on dispose', () => {
    const { makeTransport, evaluator } = setup()
    evaluator.setFen(START)
    evaluator.dispose()
    vi.advanceTimersByTime(1000)
    expect(makeTransport).not.toHaveBeenCalled()
  })
})
