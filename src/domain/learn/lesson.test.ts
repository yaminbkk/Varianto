import { describe, expect, it } from 'vitest'
import {
  currentPrompt,
  hintSquare,
  solve,
  startLesson,
  submitMove,
  undoMove,
  type Lesson,
} from './lesson'

const ITALIAN = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4']

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.freeze(value)
    for (const child of Object.values(value)) deepFreeze(child)
  }
  return value
}

function play(lesson: Lesson, ...sans: string[]): Lesson {
  return sans.reduce((l, san) => submitMove(l, san).lesson, lesson)
}

describe('startLesson', () => {
  it('starts at the first move for White', () => {
    const lesson = startLesson(ITALIAN, 'white')
    expect(lesson.cursor).toBe(0)
    expect(lesson.finished).toBe(false)
    expect(lesson.solved).toBe(false)
    expect(currentPrompt(lesson)).toBe('Play pawn to e4.')
  })

  it('plays the opponent first move when the learner is Black', () => {
    const lesson = startLesson(ITALIAN, 'black')
    expect(lesson.cursor).toBe(1)
    expect(currentPrompt(lesson)).toBe('Play pawn to e5.')
  })
})

describe('submitMove', () => {
  it('advances past the learner move and the opponent reply', () => {
    const { lesson, outcome } = submitMove(startLesson(ITALIAN, 'white'), 'e4')
    expect(outcome).toEqual({ kind: 'correct' })
    expect(lesson.cursor).toBe(2)
    expect(lesson.finished).toBe(false)
  })

  it('finishes when the learner plays the last move', () => {
    const lesson = play(startLesson(ITALIAN, 'white'), 'e4', 'Nf3', 'Bc4')
    expect(lesson.cursor).toBe(5)
    expect(lesson.finished).toBe(true)
    expect(currentPrompt(lesson)).toBeNull()
  })

  it('finishes after the opponent reply when the line ends on the opponent move', () => {
    const { lesson } = submitMove(startLesson(['e4', 'e5'], 'white'), 'e4')
    expect(lesson.cursor).toBe(2)
    expect(lesson.finished).toBe(true)
  })

  it('reports the expected move on a wrong move and keeps the lesson', () => {
    const start = startLesson(ITALIAN, 'white')
    const { lesson, outcome } = submitMove(start, 'd4')
    expect(outcome).toEqual({ kind: 'wrong', expected: 'e4' })
    expect(lesson).toEqual(start)
  })

  it('treats a null move (illegal drop) as invalid and keeps the lesson', () => {
    const start = startLesson(ITALIAN, 'white')
    const { lesson, outcome } = submitMove(start, null)
    expect(outcome).toEqual({ kind: 'invalid' })
    expect(lesson).toEqual(start)
  })

  it('ignores moves once the line is finished', () => {
    const done = play(startLesson(['e4', 'e5'], 'white'), 'e4')
    const { lesson, outcome } = submitMove(done, 'e4')
    expect(outcome).toEqual({ kind: 'invalid' })
    expect(lesson).toEqual(done)
  })
})

describe('undoMove', () => {
  it('returns to the learner previous turn', () => {
    const start = startLesson(ITALIAN, 'white')
    const one = play(start, 'e4')
    const two = play(one, 'Nf3')
    expect(undoMove(two).cursor).toBe(2)
    expect(undoMove(undoMove(two)).cursor).toBe(0)
  })

  it('does nothing at the first learner turn', () => {
    expect(undoMove(startLesson(ITALIAN, 'white'))).toEqual(startLesson(ITALIAN, 'white'))
    expect(undoMove(startLesson(ITALIAN, 'black')).cursor).toBe(1)
  })

  it('reopens a finished line', () => {
    const done = play(startLesson(['e4', 'e5'], 'white'), 'e4')
    const back = undoMove(done)
    expect(back.cursor).toBe(0)
    expect(back.finished).toBe(false)
  })
})

describe('hintSquare', () => {
  it('names the from-square of the expected move', () => {
    expect(hintSquare(startLesson(ITALIAN, 'white'))).toBe('e2')
    expect(hintSquare(play(startLesson(ITALIAN, 'white'), 'e4'))).toBe('g1')
  })

  it('is null when finished', () => {
    expect(hintSquare(play(startLesson(['e4', 'e5'], 'white'), 'e4'))).toBeNull()
  })
})

describe('solve', () => {
  it('plays the expected move and marks the lesson solved', () => {
    const lesson = solve(startLesson(ITALIAN, 'white'))
    expect(lesson.cursor).toBe(2)
    expect(lesson.solved).toBe(true)
  })

  it('keeps solved set after later correct moves and undo', () => {
    const lesson = play(solve(startLesson(ITALIAN, 'white')), 'Nf3')
    expect(lesson.solved).toBe(true)
    expect(undoMove(lesson).solved).toBe(true)
  })
})

describe('immutability', () => {
  it('never mutates its input', () => {
    const start = deepFreeze(startLesson(ITALIAN, 'white'))
    expect(() => {
      submitMove(start, 'e4')
      submitMove(start, 'd4')
      undoMove(start)
      solve(start)
    }).not.toThrow()
  })
})
