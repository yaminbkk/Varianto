import { useEffect, useId, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { findOpenings } from '../domain/openings/search'
import type { OpeningLine } from '../domain/openings/types'
import type { Color } from '../domain/repertoire/tree'
import { repertoirePath } from './paths'
import SideField from './SideField'
import ActionError from './ActionError'
import { failureMessage, useAppStore, useStoreSnapshot } from './useAppStore'

const MAX_RESULTS = 50

/** Search over the opening library. The library is fetched as its own chunk on first mount. */
export default function OpeningPicker({
  message,
  onFailure,
}: {
  message: string | null
  onFailure: (message: string | null) => void
}) {
  const fromOpening = useAppStore((s) => s.fromOpening)
  const getState = useStoreSnapshot()
  const navigate = useNavigate()
  const searchId = useId()
  const statusId = useId()

  const [library, setLibrary] = useState<OpeningLine[] | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [query, setQuery] = useState('')
  const [color, setColor] = useState<Color>('white')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    import('../data/openings.json').then(
      (mod) => {
        if (!alive) return
        setLoadFailed(false)
        setLibrary(mod.default)
      },
      () => {
        if (alive) setLoadFailed(true)
      },
    )
    return () => {
      alive = false
    }
  }, [attempt])

  const matches = useMemo(() => (library ? findOpenings(library, query) : []), [library, query])
  const shown = matches.slice(0, MAX_RESULTS)

  async function pick(line: OpeningLine) {
    setBusy(true)
    onFailure(null)
    const id = await fromOpening(line, color)
    setBusy(false)
    if (id === '') onFailure(failureMessage(getState()))
    if (id !== '') void navigate(repertoirePath(id))
  }

  function retry() {
    setLoadFailed(false)
    setAttempt((n) => n + 1)
  }

  return (
    <section className="panel" aria-labelledby={`${searchId}-title`}>
      <h2 id={`${searchId}-title`}>Start from an opening</h2>
      <SideField name="opening-side" value={color} onChange={setColor} />
      <div className="field">
        <label htmlFor={searchId}>Search by name or ECO code</label>
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-describedby={statusId}
          autoComplete="off"
          disabled={library === null}
        />
      </div>
      {loadFailed ? (
        <div role="alert" className="alert">
          <p>The opening library could not be loaded.</p>
          <button type="button" className="btn" onClick={retry}>
            Try again
          </button>
        </div>
      ) : (
        <p id={statusId} className="hint" role="status">
          {library === null
            ? 'Loading openings...'
            : matches.length === 0
              ? 'No openings match your search.'
              : matches.length > shown.length
                ? `Showing the first ${shown.length} of ${matches.length} openings. Type more to narrow the list.`
                : `${matches.length} ${matches.length === 1 ? 'opening' : 'openings'}.`}
        </p>
      )}
      <ActionError message={message} />
      {shown.length > 0 && (
        <ul className="results">
          {shown.map((line) => (
            <li key={`${line.eco}-${line.name}-${line.pgn}`}>
              <button
                type="button"
                className="result"
                disabled={busy}
                onClick={() => void pick(line)}
              >
                <span className="result-name">
                  <span className="eco">{line.eco}</span> {line.name}
                </span>
                <span className="result-moves">{line.pgn}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
