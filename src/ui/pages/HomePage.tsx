import { useEffect, useId, useRef, useState, type FormEvent, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import type { Color } from '../../domain/repertoire/tree'
import ImportPgn from '../ImportPgn'
import OpeningPicker from '../OpeningPicker'
import { repertoirePath } from '../paths'
import SideField from '../SideField'
import { useAppStore } from '../useAppStore'

type Panel = 'opening' | 'import' | null

export default function HomePage() {
  const summaries = useAppStore((s) => s.summaries)
  const error = useAppStore((s) => s.error)
  const saveError = useAppStore((s) => s.saveError)
  const loadList = useAppStore((s) => s.loadList)
  const create = useAppStore((s) => s.create)

  const baseId = useId()
  const nameId = `${baseId}-name`
  const nameErrorId = `${baseId}-name-error`
  const nameRef = useRef<HTMLInputElement>(null)
  const mainRef = useRef<HTMLElement>(null)

  const [loaded, setLoaded] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [panel, setPanel] = useState<Panel>(null)
  const [name, setName] = useState('')
  const [color, setColor] = useState<Color>('white')
  const [nameError, setNameError] = useState('')
  const [busy, setBusy] = useState(false)

  // rename and setColor do not refresh the list, so always reload on mount.
  useEffect(() => {
    let alive = true
    loadList().then(
      () => {
        if (alive) setLoaded(true)
      },
      () => {
        if (alive) setLoadFailed(true)
      },
    )
    return () => {
      alive = false
    }
  }, [loadList])

  function togglePanel(next: Exclude<Panel, null>) {
    setPanel((current) => (current === next ? null : next))
  }

  // A plain href="#main" would change the hash route, so move focus by hand.
  function skipToMain(e: MouseEvent) {
    e.preventDefault()
    mainRef.current?.focus()
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    if (name.trim() === '') {
      setNameError('Enter a name for the repertoire.')
      nameRef.current?.focus()
      return
    }
    setNameError('')
    setBusy(true)
    const id = await create(name.trim(), color)
    setBusy(false)
    if (id !== '') setName('')
  }

  const actions = (
    <div className="actions">
      <button
        type="button"
        className="btn btn-primary"
        aria-expanded={panel === 'opening'}
        onClick={() => togglePanel('opening')}
      >
        Start from an opening
      </button>
      <button
        type="button"
        className="btn"
        aria-expanded={panel === 'import'}
        onClick={() => togglePanel('import')}
      >
        Import PGN
      </button>
    </div>
  )

  return (
    <>
      <a className="skip-link" href="#main" onClick={skipToMain}>
        Skip to main content
      </a>
      <main id="main" ref={mainRef} tabIndex={-1} className="app">
        <h1>Varianto</h1>
        <p className="hint">A free, local-first chess opening trainer.</p>

        <div className="alerts" role="alert">
          {error && <p className="alert">{error}</p>}
          {saveError && <p className="alert">Changes are not saved. Check browser storage.</p>}
          {loadFailed && (
            <p className="alert">Your repertoires could not be loaded. Check browser storage.</p>
          )}
        </div>

        <section aria-labelledby={`${baseId}-list`}>
          <h2 id={`${baseId}-list`}>Your repertoires</h2>
          {!loaded && !loadFailed ? (
            <p className="hint">Loading...</p>
          ) : summaries.length === 0 ? (
            <div className="empty">
              <p>No repertoires yet. Start from a known opening or import your own PGN.</p>
              {actions}
            </div>
          ) : (
            <>
              <ul className="rep-list">
                {summaries.map((s) => (
                  <li key={s.id}>
                    <Link to={repertoirePath(s.id)} className="rep-link">
                      <span className="rep-name">{s.name}</span>
                      <span className="badge">{s.color === 'white' ? 'White' : 'Black'}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              {actions}
            </>
          )}
        </section>

        {panel === 'opening' && <OpeningPicker />}
        {panel === 'import' && <ImportPgn />}

        <section className="panel" aria-labelledby={`${baseId}-new`}>
          <h2 id={`${baseId}-new`}>New repertoire</h2>
          <form onSubmit={(e) => void onCreate(e)} noValidate>
            <div className="field">
              <label htmlFor={nameId}>Name</label>
              <input
                id={nameId}
                ref={nameRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-required="true"
                aria-invalid={nameError !== ''}
                aria-describedby={nameError ? nameErrorId : undefined}
                autoComplete="off"
              />
              {nameError && (
                <p id={nameErrorId} className="field-error" role="alert">
                  {nameError}
                </p>
              )}
            </div>
            <SideField name="new-side" value={color} onChange={setColor} />
            <button type="submit" className="btn btn-primary" disabled={busy}>
              Create repertoire
            </button>
          </form>
        </section>
      </main>
    </>
  )
}
