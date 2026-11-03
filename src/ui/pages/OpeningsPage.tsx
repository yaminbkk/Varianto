import { useId, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ecoFamily } from '../../domain/openings/ecoFamily'
import { findOpenings } from '../../domain/openings/search'
import { homePath, openingPath } from '../paths'
import SkipLink from '../SkipLink'
import { useOpeningData } from '../useOpeningData'

const MAX_RESULTS = 50

/** Browse and search the opening library. */
export default function OpeningsPage() {
  const state = useOpeningData()
  const searchId = useId()
  const statusId = useId()
  const mainRef = useRef<HTMLElement>(null)
  const [query, setQuery] = useState('')

  const data = state.status === 'ready' ? state.data : null
  const matches = useMemo(() => (data ? findOpenings(data.lines, query) : []), [data, query])
  const shown = matches.slice(0, MAX_RESULTS)
  const groups = useMemo(() => {
    const byFamily = new Map<string, typeof shown>()
    for (const line of shown) {
      const family = ecoFamily(line.eco)
      byFamily.set(family, [...(byFamily.get(family) ?? []), line])
    }
    return [...byFamily.entries()]
  }, [shown])

  return (
    <>
      <SkipLink targetRef={mainRef} />
      <main id="main" ref={mainRef} tabIndex={-1} className="app">
        <p>
          <Link to={homePath}>Back to your repertoires</Link>
        </p>
        <h1>Openings</h1>
        <p className="hint">Browse the opening library and open any line on a board.</p>
        <div className="field">
          <label htmlFor={searchId}>Search by name or ECO code</label>
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-describedby={statusId}
            autoComplete="off"
            disabled={data === null}
          />
        </div>
        {state.status === 'failed' ? (
          <div role="alert" className="alert">
            <p>The opening library could not be loaded.</p>
            <button type="button" className="btn" onClick={state.retry}>
              Try again
            </button>
          </div>
        ) : (
          <p id={statusId} className="hint" role="status">
            {data === null
              ? 'Loading openings...'
              : matches.length === 0
                ? 'No openings match your search.'
                : matches.length > shown.length
                  ? `Showing the first ${shown.length} of ${matches.length} openings. Type more to narrow the list.`
                  : `${matches.length} ${matches.length === 1 ? 'opening' : 'openings'}.`}
          </p>
        )}
        {data &&
          groups.map(([family, lines]) => (
            <section key={family} aria-labelledby={`${searchId}-${family}`}>
              <h2 id={`${searchId}-${family}`}>{family}</h2>
              <ul className="results">
                {lines.map((line) => {
                  const key = data.keyOf.get(line) ?? ''
                  const summary = data.descriptions[key]?.summary
                  return (
                    <li key={`${line.eco}-${line.name}-${line.pgn}`}>
                      <Link className="result" to={openingPath(key)}>
                        <span className="result-name">
                          <span className="eco">{line.eco}</span> {line.name}
                        </span>
                        <span className="result-moves">{summary ?? line.pgn}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
      </main>
    </>
  )
}
