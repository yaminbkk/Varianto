import { useState } from 'react'
import type { CourseLine } from '../domain/learn/courses'
import { lineOwner } from '../domain/learn/depth'
import {
  currentPrompt,
  hintSquare,
  solve,
  startLesson,
  submitMove,
  type Lesson,
} from '../domain/learn/lesson'
import { sanSequence } from '../domain/openings/parse'
import { sanFromSquares } from '../domain/repertoire/squares'
import Board from './Board'

/** How a line went: used to grade a practice review. */
export interface LineResult {
  mistakes: number
  hinted: boolean
  solved: boolean
}

interface LinePlayerProps {
  line: CourseLine
  /** Offer Hint and Solve. */
  allowHint: boolean
  /** Called once, when the learner reaches the end of the line. */
  onDone: (result: LineResult) => void
  /** When given, the first wrong move ends the line (the drill) instead of letting the learner retry. */
  onFail?: () => void
}

/** Plays one line from memory: the learner moves their side, the opponent's replies are automatic. */
export default function LinePlayer({ line, allowHint, onDone, onFail }: LinePlayerProps) {
  const side = lineOwner(line.plies)
  const [lesson, setLesson] = useState<Lesson>(() =>
    startLesson(sanSequence(line.line.pgn).split(' '), side),
  )
  const [mistakes, setMistakes] = useState(0)
  const [hinted, setHinted] = useState(false)
  const [hintOn, setHintOn] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [resetToken, setResetToken] = useState(0)

  function advance(next: Lesson, result: LineResult) {
    setLesson(next)
    setHintOn(false)
    setMessage(null)
    if (next.finished && !lesson.finished) onDone(result)
  }

  function onMove(from: string, to: string) {
    const san = sanFromSquares(lesson.fens[lesson.cursor] ?? '', from, to)
    const { lesson: next, outcome } = submitMove(lesson, san)
    if (outcome.kind === 'correct') {
      advance(next, { mistakes, hinted, solved: next.solved })
      return
    }
    // Let the learner see where the piece landed, then slide it back.
    window.setTimeout(() => setResetToken((n) => n + 1), 450)
    if (outcome.kind === 'invalid') {
      setMessage('That move is not allowed. Try another one.')
      return
    }
    if (onFail) {
      onFail()
      return
    }
    setMistakes((m) => m + 1)
    setMessage('That is not the move you learned. Try again.')
  }

  function onHint() {
    if (!hintOn) {
      setHintOn(true)
      setHinted(true)
      return
    }
    const next = solve(lesson)
    advance(next, { mistakes, hinted: true, solved: true })
  }

  const prompt = currentPrompt(lesson)
  const hint = hintOn ? hintSquare(lesson) : null

  return (
    <div className="board-layout">
      <div className="board-column">
        <Board
          fen={lesson.fens[lesson.cursor] ?? lesson.fens[0] ?? ''}
          orientation={side}
          canMove={!lesson.finished}
          onMove={onMove}
          hint={hint}
          resetToken={resetToken}
        />
      </div>
      <div>
        <section className="panel" aria-labelledby="line-heading">
          <h2 id="line-heading">{line.line.name}</h2>
          <p className="hint">Playing {side === 'white' ? 'White' : 'Black'}</p>
          <progress value={lesson.cursor} max={lesson.sans.length} aria-label="Line progress">
            {lesson.cursor} of {lesson.sans.length}
          </progress>
          <p role="status">{lesson.finished ? 'Line finished.' : prompt}</p>
          <div role="alert">{message && <p className="alert">{message}</p>}</div>
          {allowHint && !lesson.finished && (
            <div className="actions">
              <button type="button" className="btn" onClick={onHint}>
                {hintOn ? 'Solve' : 'Show hint'}
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
