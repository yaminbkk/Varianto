import { Chess } from 'chess.js'
import type { Color } from '../repertoire/tree'
import { promptFor } from './prompt'

export interface Lesson {
  sans: string[]
  /** fens[i] is the position before ply i, so fens.length === sans.length + 1. */
  fens: string[]
  side: Color
  /** Index of the next ply to be played; plies before it are done. */
  cursor: number
  /** True once Solve played a move for the learner. */
  solved: boolean
  finished: boolean
}

export type Outcome =
  { kind: 'correct' } | { kind: 'wrong'; expected: string } | { kind: 'invalid' }

function stripCheck(san: string): string {
  return san.replace(/[+#]$/, '')
}

function isLearnerPly(side: Color, index: number): boolean {
  return side === 'white' ? index % 2 === 0 : index % 2 === 1
}

function withCursor(lesson: Lesson, cursor: number): Lesson {
  return { ...lesson, cursor, finished: cursor >= lesson.sans.length }
}

/** Starts a lesson on one line. When the learner is Black, White's first move is already played. */
export function startLesson(sans: readonly string[], side: Color): Lesson {
  const chess = new Chess()
  const fens = [chess.fen()]
  for (const san of sans) {
    chess.move(san, { strict: true })
    fens.push(chess.fen())
  }
  const lesson: Lesson = {
    sans: [...sans],
    fens,
    side,
    cursor: 0,
    solved: false,
    finished: sans.length === 0,
  }
  return side === 'black' ? withCursor(lesson, Math.min(1, sans.length)) : lesson
}

/** The move the learner is expected to play now, or null when the line is finished. */
function expectedMove(lesson: Lesson): string | null {
  return lesson.finished ? null : (lesson.sans[lesson.cursor] ?? null)
}

/**
 * Checks the learner's move against the line. A correct move also plays the opponent's reply.
 * `null` stands for an illegal drop.
 */
export function submitMove(
  lesson: Lesson,
  san: string | null,
): { lesson: Lesson; outcome: Outcome } {
  const expected = expectedMove(lesson)
  if (san === null || expected === null) return { lesson, outcome: { kind: 'invalid' } }
  if (stripCheck(san) !== stripCheck(expected)) {
    return { lesson, outcome: { kind: 'wrong', expected } }
  }
  // The opponent's reply (if the line has one) is played together with the learner's move.
  return {
    lesson: withCursor(lesson, Math.min(lesson.cursor + 2, lesson.sans.length)),
    outcome: { kind: 'correct' },
  }
}

/** Goes back to the learner's previous turn, undoing the opponent's reply too. */
export function undoMove(lesson: Lesson): Lesson {
  for (let i = lesson.cursor - 1; i >= 0; i--) {
    if (isLearnerPly(lesson.side, i)) return withCursor(lesson, i)
  }
  return lesson
}

/** The square the expected piece stands on, or null when the line is finished. */
export function hintSquare(lesson: Lesson): string | null {
  const expected = expectedMove(lesson)
  if (expected === null) return null
  const chess = new Chess(lesson.fens[lesson.cursor])
  const move = chess
    .moves({ verbose: true })
    .find((m) => stripCheck(m.san) === stripCheck(expected))
  return move?.from ?? null
}

/** Plays the expected move for the learner and marks the lesson as solved. */
export function solve(lesson: Lesson): Lesson {
  const expected = expectedMove(lesson)
  if (expected === null) return lesson
  return { ...submitMove(lesson, expected).lesson, solved: true }
}

export function currentPrompt(lesson: Lesson): string | null {
  const expected = expectedMove(lesson)
  return expected === null ? null : promptFor(expected)
}
