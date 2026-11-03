import { useId, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Color } from '../domain/repertoire/tree'
import { repertoirePath } from './paths'
import SideField from './SideField'
import { useAppStore } from './useAppStore'

/** Import a repertoire from pasted PGN text or a chosen .pgn file. */
export default function ImportPgn() {
  const importPgn = useAppStore((s) => s.importPgn)
  const navigate = useNavigate()
  const baseId = useId()
  const nameId = `${baseId}-name`
  const textId = `${baseId}-text`
  const fileId = `${baseId}-file`
  const nameErrorId = `${baseId}-name-error`
  const textErrorId = `${baseId}-text-error`
  const fileErrorId = `${baseId}-file-error`
  const nameRef = useRef<HTMLInputElement>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)

  const [name, setName] = useState('')
  const [color, setColor] = useState<Color>('white')
  const [text, setText] = useState('')
  const [nameError, setNameError] = useState('')
  const [textError, setTextError] = useState('')
  const [fileError, setFileError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileError('')
    try {
      setText(await file.text())
      setTextError('')
      if (name.trim() === '') setName(file.name.replace(/\.pgn$/i, ''))
    } catch {
      setFileError('That file could not be read. Try another file or paste the PGN text.')
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const nameMissing = name.trim() === ''
    const textMissing = text.trim() === ''
    setNameError(nameMissing ? 'Enter a name for the repertoire.' : '')
    setTextError(textMissing ? 'Paste PGN text or choose a file.' : '')
    if (nameMissing) {
      nameRef.current?.focus()
      return
    }
    if (textMissing) {
      textRef.current?.focus()
      return
    }
    setBusy(true)
    const id = await importPgn(text, name.trim(), color)
    setBusy(false)
    if (id !== '') void navigate(repertoirePath(id))
  }

  return (
    <section className="panel" aria-labelledby={`${baseId}-title`}>
      <h2 id={`${baseId}-title`}>Import PGN</h2>
      <form onSubmit={(e) => void onSubmit(e)} noValidate>
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
        <SideField name="import-side" value={color} onChange={setColor} />
        <div className="field">
          <label htmlFor={fileId}>PGN file (optional)</label>
          <input
            id={fileId}
            type="file"
            accept=".pgn,text/plain"
            onChange={(e) => void onFile(e)}
            aria-describedby={fileError ? fileErrorId : undefined}
          />
          {fileError && (
            <p id={fileErrorId} className="field-error" role="alert">
              {fileError}
            </p>
          )}
        </div>
        <div className="field">
          <label htmlFor={textId}>PGN text</label>
          <textarea
            id={textId}
            ref={textRef}
            rows={8}
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-required="true"
            aria-invalid={textError !== ''}
            aria-describedby={textError ? textErrorId : undefined}
            spellCheck={false}
          />
          {textError && (
            <p id={textErrorId} className="field-error" role="alert">
              {textError}
            </p>
          )}
        </div>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Importing...' : 'Import'}
        </button>
      </form>
    </section>
  )
}
