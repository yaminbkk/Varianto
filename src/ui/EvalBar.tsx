import { barFill, describeEvaluation, evalLabel } from '../domain/eval/bar'
import type { EvalView } from './useEvaluation'

interface EvalBarProps {
  view: EvalView
  /** The board's orientation: the side shown at the bottom. */
  orientation: 'white' | 'black'
}

function ariaLabel({ state, evaluation }: EvalView): string {
  if (state.status === 'error') return 'Evaluation unavailable'
  return evaluation ? describeEvaluation(evaluation) : 'Evaluating position'
}

/** A vertical bar beside the board: the lighter part is White's share. */
export default function EvalBar({ view, orientation }: EvalBarProps) {
  const { state, evaluation } = view
  const fill = evaluation ? barFill(evaluation) : 0.5
  const whiteAtBottom = orientation === 'white'
  const whiteLeads = fill >= 0.5
  // The label sits at the end of the side that is ahead.
  const labelAtBottom = whiteLeads === whiteAtBottom
  return (
    <div
      className="eval-bar"
      role="img"
      aria-label={ariaLabel(view)}
      data-thinking={state.status === 'thinking'}
      data-error={state.status === 'error'}
      data-white-at={whiteAtBottom ? 'bottom' : 'top'}
    >
      <div className="eval-bar-white" style={{ height: `${fill * 100}%` }} />
      {evaluation && (
        <span
          className="eval-bar-label"
          data-end={labelAtBottom ? 'bottom' : 'top'}
          data-lead={whiteLeads ? 'white' : 'black'}
        >
          {evalLabel(evaluation)}
        </span>
      )}
    </div>
  )
}
