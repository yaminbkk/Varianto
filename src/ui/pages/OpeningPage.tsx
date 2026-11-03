import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { describeOpening } from '../../domain/openings/describe'
import { openingPositions, START_FEN } from '../../domain/openings/positions'
import type { Color } from '../../domain/repertoire/tree'
import ActionError from '../ActionError'
import Board from '../Board'
import { openingsPath, repertoirePath } from '../paths'
import SideField from '../SideField'
import SkipLink from '../SkipLink'
import { stepBy } from '../stepNav'
import { failureMessage, useAppStore, useStoreSnapshot } from '../useAppStore'
import { useOpeningData } from '../useOpeningData'

function noMove() {}

/** One opening: a view-only board to step through, its description, and a way to practice it. */
export default function OpeningPage() {
  const { key = '' } = useParams()
  // Remount per opening so the step index starts at the beginning.
  return <OpeningView key={key} openingKey={key} />
}

function OpeningView({ openingKey: key }: { openingKey: string }) {
  const state = useOpeningData()
  const fromOpening = useAppStore((s) => s.fromOpening)
  const getState = useStoreSnapshot()
  const navigate = useNavigate()
  const mainRef = useRef<HTMLElement>(null)
  const [step, setStep] = useState(0)
  const [color, setColor] = useState<Color>('white')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const line = state.status === 'ready' ? state.data.index.get(key) : undefined
  const positions = useMemo(() => (line ? openingPositions(line) : []), [line])
  const info =
    line && state.status === 'ready' ? describeOpening(line, state.data.descriptions) : null
  const total = positions.length

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      if (target && /^(input|textarea|select)$/i.test(target.tagName)) return
      if (e.key === 'ArrowLeft') setStep((s) => stepBy(s, -1, total))
      if (e.key === 'ArrowRight') setStep((s) => stepBy(s, 1, total))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [total])

  async function start() {
    if (!line) return
    setBusy(true)
    setMessage(null)
    const id = await fromOpening(line, color)
    setBusy(false)
    if (id === '') setMessage(failureMessage(getState()))
    else void navigate(repertoirePath(id))
  }

  const back = (
    <p>
      <Link to={openingsPath}>Back to all openings</Link>
    </p>
  )

  if (state.status !== 'ready') {
    return (
      <main id="main" className="app">
        {back}
        {state.status === 'failed' ? (
          <div role="alert" className="alert">
            <p>The opening library could not be loaded.</p>
            <button type="button" className="btn" onClick={state.retry}>
              Try again
            </button>
          </div>
        ) : (
          <p role="status">Loading opening...</p>
        )}
      </main>
    )
  }

  if (!line || !info) {
    return (
      <main id="main" className="app">
        {back}
        <h1>Opening not found</h1>
        <p>That opening is not in the library.</p>
      </main>
    )
  }

  const fen = step === 0 ? START_FEN : (positions[step - 1]?.fen ?? START_FEN)
  const played = step === 0 ? 'Start position' : `After ${positions[step - 1]?.san ?? ''}`

  return (
    <>
      <SkipLink targetRef={mainRef} />
      <main id="main" ref={mainRef} tabIndex={-1} className="app app-wide">
        {back}
        <h1>{info.title}</h1>
        <p className="hint">
          <span className="eco">{line.eco}</span> · {info.family} · {info.moveCount}{' '}
          {info.moveCount === 1 ? 'move' : 'moves'}
        </p>

        <div className="board-layout">
          <div className="board-column">
            <Board fen={fen} orientation={color} canMove={false} onMove={noMove} />
            <div className="actions">
              <button
                type="button"
                className="btn"
                disabled={step === 0}
                onClick={() => setStep(0)}
              >
                Start
              </button>
              <button
                type="button"
                className="btn"
                disabled={step === 0}
                onClick={() => setStep((s) => stepBy(s, -1, total))}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn"
                disabled={step === total}
                onClick={() => setStep((s) => stepBy(s, 1, total))}
              >
                Next
              </button>
            </div>
            <p className="hint" role="status">
              {played} ({step} of {total})
            </p>
          </div>

          <div>
            <section className="panel" aria-labelledby="about-heading">
              <h2 id="about-heading">About this opening</h2>
              {info.description ? (
                <>
                  <p>{info.description.summary}</p>
                  {info.description.ideas && info.description.ideas.length > 0 && (
                    <ul>
                      {info.description.ideas.map((idea) => (
                        <li key={idea}>{idea}</li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <p>No written description yet. The main line is {info.mainLine}.</p>
              )}
            </section>

            <section className="panel" aria-labelledby="start-heading">
              <h2 id="start-heading">Practice this opening</h2>
              <SideField name="opening-page-side" value={color} onChange={setColor} />
              <ActionError message={message} />
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy}
                onClick={() => void start()}
              >
                Start a repertoire from this opening
              </button>
            </section>
          </div>
        </div>
      </main>
    </>
  )
}
