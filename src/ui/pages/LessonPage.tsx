import { useRef, useState, type ReactNode } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import type { Course, CourseLine } from '../../domain/learn/courses'
import { DEPTHS, type Depth } from '../../domain/learn/depth'
import {
  currentPrompt,
  hintSquare,
  solve,
  startLesson,
  submitMove,
  undoMove,
  type Lesson,
} from '../../domain/learn/lesson'
import { courseProgress, nextLine } from '../../domain/learn/nextLine'
import { sanSequence } from '../../domain/openings/parse'
import { sanFromSquares } from '../../domain/repertoire/squares'
import type { Color } from '../../domain/repertoire/tree'
import { useEffect } from 'react'
import Board from '../Board'
import { coursePath, learnPath } from '../paths'
import SkipLink from '../SkipLink'
import { useCourses } from '../useCourses'
import { useProgress } from '../useProgress'

function isDepth(value: string | null): value is Depth {
  return DEPTHS.some((d) => d === value)
}

function isSide(value: string | null): value is Color {
  return value === 'white' || value === 'black'
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <main id="main" className="app">
      <p>
        <Link to={learnPath}>Back to all courses</Link>
      </p>
      {children}
    </main>
  )
}

/** A guided session: the learner plays their side of each line and the opponent replies. */
export default function LessonPage() {
  const { courseId = '' } = useParams()
  const [params] = useSearchParams()
  const state = useCourses()
  const depthParam = params.get('depth')
  const sideParam = params.get('side')

  if (state.status === 'failed') {
    return (
      <Shell>
        <div role="alert" className="alert">
          <p>The opening library could not be loaded.</p>
          <button type="button" className="btn" onClick={state.retry}>
            Try again
          </button>
        </div>
      </Shell>
    )
  }
  if (state.status === 'loading') {
    return (
      <Shell>
        <p role="status">Loading lesson...</p>
      </Shell>
    )
  }
  const course = state.courses.find((c) => c.id === courseId)
  if (!course) {
    return (
      <Shell>
        <h1>Course not found</h1>
        <p>That course is not in the library.</p>
      </Shell>
    )
  }
  if (!isDepth(depthParam) || !isSide(sideParam)) {
    return (
      <Shell>
        <h1>Lesson not found</h1>
        <p>
          Choose a side and a depth on the <Link to={coursePath(course.id)}>course page</Link>.
        </p>
      </Shell>
    )
  }
  return <Runner course={course} depth={depthParam} side={sideParam} />
}

function Runner({ course, depth, side }: { course: Course; depth: Depth; side: Color }) {
  const progress = useProgress()
  const [learned, setLearned] = useState<ReadonlySet<string> | null>(null)
  const [lineKey, setLineKey] = useState<string | null | undefined>(undefined)
  // Lines finished with Solve this visit: they do not count as learned, but Next line moves past them.
  const [skipped, setSkipped] = useState<ReadonlySet<string>>(new Set())

  useEffect(() => {
    let alive = true
    progress.learnedLines(course.id).then(
      (set) => {
        if (!alive) return
        setLearned(set)
        setLineKey(nextLine(course, depth, side, set)?.key ?? null)
      },
      () => {
        if (!alive) return
        setLearned(new Set())
        setLineKey(nextLine(course, depth, side, new Set())?.key ?? null)
      },
    )
    return () => {
      alive = false
    }
  }, [progress, course, depth, side])

  if (learned === null || lineKey === undefined) {
    return (
      <Shell>
        <p role="status">Loading lesson...</p>
      </Shell>
    )
  }
  const line = course.lines.find((l) => l.key === lineKey)
  if (!line) {
    return (
      <Shell>
        <h1>{course.name}</h1>
        <p role="status">
          {courseProgress(course, depth, side, learned).total === 0
            ? 'This course has no lines for this side at this depth.'
            : skipped.size > 0
              ? 'No more new lines at this depth. Lines you finished with Solve are not counted yet.'
              : 'Course complete at this depth.'}
        </p>
        <Link className="btn btn-primary" to={coursePath(course.id)}>
          Back to course
        </Link>
      </Shell>
    )
  }

  async function onLearned(key: string) {
    const next = new Set(learned)
    next.add(key)
    setLearned(next)
    try {
      await progress.markLearned(course.id, key)
    } catch {
      // Progress could not be saved; the session still works and the line stays unlearned on reload.
    }
  }

  return (
    <Session
      key={line.key}
      course={course}
      line={line}
      depth={depth}
      side={side}
      learned={learned}
      onLearned={onLearned}
      onNext={(nextLearned, solvedKey) => {
        const nextSkipped = solvedKey ? new Set([...skipped, solvedKey]) : skipped
        setSkipped(nextSkipped)
        setLineKey(
          nextLine(course, depth, side, new Set([...nextLearned, ...nextSkipped]))?.key ?? null,
        )
      }}
    />
  )
}

function Session({
  course,
  line,
  depth,
  side,
  learned,
  onLearned,
  onNext,
}: {
  course: Course
  line: CourseLine
  depth: Depth
  side: Color
  learned: ReadonlySet<string>
  onLearned: (key: string) => Promise<void>
  onNext: (learned: ReadonlySet<string>, solvedKey: string | null) => void
}) {
  const mainRef = useRef<HTMLElement>(null)
  const sans = sanSequence(line.line.pgn).split(' ')
  const [lesson, setLesson] = useState<Lesson>(() => startLesson(sans, side))
  const [boardKey, setBoardKey] = useState(0)
  const [message, setMessage] = useState<string | null>(null)
  const [hintOn, setHintOn] = useState(false)
  const [reply, setReply] = useState<string | null>(() =>
    side === 'black' ? `White played ${sans[0] ?? ''}.` : null,
  )
  const opponent = side === 'white' ? 'Black' : 'White'

  function apply(next: Lesson, previous: Lesson) {
    setLesson(next)
    setHintOn(false)
    setMessage(null)
    const replyIndex = previous.cursor + 1
    setReply(
      next.cursor > previous.cursor + 1
        ? `${opponent} played ${next.sans[replyIndex] ?? ''}.`
        : null,
    )
    if (next.finished && !previous.finished && !next.solved) void onLearned(line.key)
  }

  function onMove(from: string, to: string) {
    const san = sanFromSquares(lesson.fens[lesson.cursor] ?? '', from, to)
    const { lesson: next, outcome } = submitMove(lesson, san)
    if (outcome.kind === 'correct') {
      apply(next, lesson)
      return
    }
    setBoardKey((k) => k + 1)
    if (outcome.kind === 'wrong') {
      setMessage(`That is a fine move, but this line plays ${outcome.expected}.`)
    } else {
      setMessage('That move is not allowed. Try another one.')
    }
  }

  function onHint() {
    if (hintOn) {
      const next = solve(lesson)
      apply(next, lesson)
      // Solving keeps the line from counting as learned, even though it finishes.
      if (next.finished && !lesson.finished) setBoardKey((k) => k + 1)
    } else {
      setHintOn(true)
    }
  }

  function onUndo() {
    const next = undoMove(lesson)
    setLesson(next)
    setHintOn(false)
    setMessage(null)
    setReply(null)
    setBoardKey((k) => k + 1)
  }

  const done = learned.has(line.key)
  const prompt = currentPrompt(lesson)
  const hint = hintOn ? hintSquare(lesson) : null
  const { done: lineCount, total } = courseProgress(course, depth, side, learned)

  return (
    <>
      <SkipLink targetRef={mainRef} />
      <main id="main" ref={mainRef} tabIndex={-1} className="app app-wide">
        <p>
          <Link to={coursePath(course.id)}>Back to course</Link>
        </p>
        <h1>{line.line.name}</h1>
        <p className="hint">
          Playing {side === 'white' ? 'White' : 'Black'} · {lineCount} of {total} lines learned
        </p>

        <div className="board-layout">
          <div className="board-column">
            <Board
              key={boardKey}
              fen={lesson.fens[lesson.cursor] ?? lesson.fens[0] ?? ''}
              orientation={side}
              canMove={!lesson.finished}
              onMove={onMove}
              hint={hint}
            />
          </div>

          <div>
            <section className="panel" aria-labelledby="lesson-heading">
              <h2 id="lesson-heading">Your move</h2>
              <progress value={lesson.cursor} max={lesson.sans.length} aria-label="Line progress">
                {lesson.cursor} of {lesson.sans.length}
              </progress>
              {reply && <p>{reply}</p>}
              {lesson.finished ? (
                <p role="status">
                  {lesson.solved
                    ? 'Line finished. You used Solve, so it is not counted yet.'
                    : 'Line learned!'}
                </p>
              ) : (
                <p role="status">{prompt}</p>
              )}
              <div role="alert">{message && <p className="alert">{message}</p>}</div>

              {lesson.finished ? (
                <div className="actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() =>
                      onNext(addKey(learned, lesson, line.key), lesson.solved ? line.key : null)
                    }
                  >
                    Next line
                  </button>
                  <Link className="btn" to={coursePath(course.id)}>
                    Back to course
                  </Link>
                </div>
              ) : (
                <div className="actions">
                  <button type="button" className="btn" onClick={onHint}>
                    {hintOn ? 'Solve' : 'Show hint'}
                  </button>
                  <button type="button" className="btn" onClick={onUndo}>
                    Undo move
                  </button>
                  {message && (
                    <button type="button" className="btn" onClick={() => setMessage(null)}>
                      Try again
                    </button>
                  )}
                </div>
              )}
              {done && !lesson.finished && (
                <p className="hint">You have learned this line before.</p>
              )}
            </section>
          </div>
        </div>
      </main>
    </>
  )
}

/** The learned set after this line: it counts unless the learner used Solve. */
function addKey(learned: ReadonlySet<string>, lesson: Lesson, key: string): ReadonlySet<string> {
  if (lesson.solved) return learned
  const next = new Set(learned)
  next.add(key)
  return next
}
