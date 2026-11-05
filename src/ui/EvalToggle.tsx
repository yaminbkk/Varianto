interface EvalToggleProps {
  enabled: boolean
  onToggle: () => void
  /** Why the engine could not run, when it could not. */
  error: string | null
}

/** The on/off button for the eval bar, with the credit for the engine and any error. */
export default function EvalToggle({ enabled, onToggle, error }: EvalToggleProps) {
  return (
    <>
      <button type="button" className="btn" aria-pressed={enabled} onClick={onToggle}>
        Eval bar: {enabled ? 'on' : 'off'}
      </button>
      {enabled && (
        <p className="hint">Evaluation by Stockfish (GPL-3.0), running on your device.</p>
      )}
      {error && (
        <p role="status" className="alert">
          Engine unavailable: {error}
        </p>
      )}
    </>
  )
}
