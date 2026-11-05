import { describe, expect, it } from 'vitest'
import type { Evaluation } from '../domain/eval/types'
import { FakeTransport } from './fakeTransport'
import { createEngineSession, type EvalUpdate } from './session'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'
const FOOLS_MATE = 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3'

function ready() {
  const transport = new FakeTransport()
  const session = createEngineSession(transport)
  transport.emit('uciok')
  transport.emit('readyok')
  return { transport, session }
}

function collect() {
  const updates: EvalUpdate[] = []
  return { updates, onUpdate: (u: EvalUpdate) => updates.push(u) }
}

const cp = (value: number, depth: number): Evaluation => ({ kind: 'cp', value, depth })

describe('createEngineSession', () => {
  it('handshakes before it searches', () => {
    const transport = new FakeTransport()
    const session = createEngineSession(transport)
    expect(transport.sent).toEqual(['uci'])
    transport.emit('uciok')
    expect(transport.sent).toEqual(['uci', 'setoption name Hash value 16', 'isready'])

    session.evaluate(START, collect().onUpdate)
    expect(transport.sent).toHaveLength(3)
    transport.emit('readyok')
    expect(transport.sent.slice(3)).toEqual([`position fen ${START}`, 'go depth 14'])
  })

  it('reports progress, then the final evaluation', () => {
    const { transport, session } = ready()
    const { updates, onUpdate } = collect()
    session.evaluate(START, onUpdate)
    transport.emit('info depth 8 seldepth 10 multipv 1 score cp 20 nodes 100 pv e2e4')
    transport.emit('info depth 14 seldepth 18 multipv 1 score cp 31 nodes 900 pv e2e4')
    transport.emit('bestmove e2e4 ponder e7e5')
    expect(updates).toEqual([
      { status: 'thinking', evaluation: null },
      { status: 'thinking', evaluation: cp(20, 8) },
      { status: 'thinking', evaluation: cp(31, 14) },
      { status: 'done', evaluation: cp(31, 14) },
    ])
  })

  it('answers a repeated position from the cache without searching again', () => {
    const { transport, session } = ready()
    session.evaluate(START, collect().onUpdate)
    transport.emit('info depth 14 score cp 31 pv e2e4')
    transport.emit('bestmove e2e4')
    const goes = transport.sent.filter((c) => c.startsWith('go')).length

    const { updates, onUpdate } = collect()
    session.evaluate(START, onUpdate)
    expect(updates).toEqual([{ status: 'done', evaluation: cp(31, 14) }])
    expect(transport.sent.filter((c) => c.startsWith('go'))).toHaveLength(goes)
  })

  it('stops a search for a newer request and drops the old output', () => {
    const { transport, session } = ready()
    const a = collect()
    const b = collect()
    session.evaluate(START, a.onUpdate)
    session.evaluate(AFTER_E4, b.onUpdate)
    expect(transport.sent.at(-1)).toBe('stop')
    expect(transport.sent).not.toContain(`position fen ${AFTER_E4}`)

    transport.emit('info depth 9 score cp 99 pv e2e4')
    expect(a.updates).toEqual([{ status: 'thinking', evaluation: null }])
    expect(b.updates).toEqual([{ status: 'thinking', evaluation: null }])

    transport.emit('bestmove e2e4')
    expect(transport.sent.slice(-2)).toEqual([`position fen ${AFTER_E4}`, 'go depth 14'])
    transport.emit('info depth 14 score cp 40 pv e7e5')
    transport.emit('bestmove e7e5')
    // Black to move: +40 for Black is -40 for White.
    expect(b.updates.at(-1)).toEqual({ status: 'done', evaluation: cp(-40, 14) })
  })

  it('does not cache a search that was stopped', () => {
    const { transport, session } = ready()
    session.evaluate(START, collect().onUpdate)
    transport.emit('info depth 6 score cp 10 pv e2e4')
    session.evaluate(AFTER_E4, collect().onUpdate)
    transport.emit('bestmove e2e4')
    transport.emit('bestmove e7e5')

    const goes = transport.sent.filter((c) => c.startsWith('go')).length
    session.evaluate(START, collect().onUpdate)
    transport.emit('bestmove e2e4')
    expect(transport.sent.filter((c) => c.startsWith('go'))).toHaveLength(goes + 1)
  })

  it('answers a finished game without the engine', () => {
    const { transport, session } = ready()
    const { updates, onUpdate } = collect()
    session.evaluate(FOOLS_MATE, onUpdate)
    expect(updates).toEqual([
      { status: 'done', evaluation: { kind: 'final', result: 'black' } },
    ])
    expect(transport.sent.some((c) => c.startsWith('go'))).toBe(false)
  })

  it('drops a running search when a finished game is requested', () => {
    const { transport, session } = ready()
    const a = collect()
    session.evaluate(START, a.onUpdate)
    session.evaluate(FOOLS_MATE, collect().onUpdate)
    expect(transport.sent.at(-1)).toBe('stop')
    transport.emit('info depth 9 score cp 99 pv e2e4')
    expect(a.updates).toEqual([{ status: 'thinking', evaluation: null }])
  })

  it('reports a worker failure to the active and later requests', () => {
    const { transport, session } = ready()
    const first = collect()
    session.evaluate(START, first.onUpdate)
    transport.fail('boom')
    expect(first.updates.at(-1)).toEqual({ status: 'error', message: 'boom' })

    const later = collect()
    session.evaluate(AFTER_E4, later.onUpdate)
    expect(later.updates).toEqual([{ status: 'error', message: 'boom' }])
  })

  it('terminates the transport on dispose and ignores later output', () => {
    const { transport, session } = ready()
    const { updates, onUpdate } = collect()
    session.evaluate(START, onUpdate)
    session.dispose()
    expect(transport.terminated).toBe(true)
    transport.emit('info depth 9 score cp 99 pv e2e4')
    transport.emit('bestmove e2e4')
    expect(updates).toEqual([{ status: 'thinking', evaluation: null }])
  })
})
