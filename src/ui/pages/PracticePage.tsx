import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Course } from '../../domain/learn/courses'
import { dueKeys, gradeFor, schedule, type Grade, type ReviewCard } from '../../domain/learn/review'
import { progressId } from '../../domain/learn/variants'
import CourseGate from '../CourseGate'
import LinePlayer, { type LineResult } from '../LinePlayer'
import { coursePath } from '../paths'
import { useProgress } from '../useProgress'

const GRADE_TEXT: Record<Grade, string> = {
  good: 'Good: you remembered it. It will come back later.',
  hard: 'Hard: you needed a hint. It will come back soon.',
  again: 'Again: it will come back very soon.',
}

/** Spaced-repetition review of the lines the learner has already learned. */
export default function PracticePage() {
  return <CourseGate>{(course) => <Practice key={course.id} course={course} />}</CourseGate>
}

function Practice({ course }: { course: Course }) {
  const progress = useProgress()
  const id = progressId(course)
  const [now] = useState(() => new Date())
  const [data, setData] = useState<{
    learned: ReadonlySet<string>
    cards: ReadonlyMap<string, ReviewCard>
  } | null>(null)
  // Lines reviewed this visit; they are not asked again until the next visit.
  const [reviewed, setReviewed] = useState<ReadonlySet<string>>(new Set())
  // The line just finished, kept on screen until the learner moves on.
  const [done, setDone] = useState<{ key: string; grade: Grade } | null>(null)

  useEffect(() => {
    let alive = true
    Promise.all([progress.learnedLines(id), progress.reviewCards(id)]).then(
      ([learned, cards]) => {
        if (alive) setData({ learned, cards })
      },
      () => {
        if (alive) setData({ learned: new Set(), cards: new Map() })
      },
    )
    return () => {
      alive = false
    }
  }, [progress, id])

  const queue = useMemo(() => {
    if (!data) return []
    const inCourse = new Set(course.lines.map((l) => l.key).filter((k) => data.learned.has(k)))
    return dueKeys(data.cards, inCourse, now).filter((k) => !reviewed.has(k))
  }, [data, course, now, reviewed])

  if (data === null) {
    return (
      <main id="main" className="app">
        <p role="status">Loading practice...</p>
      </main>
    )
  }

  const learnedHere = course.lines.filter((l) => data.learned.has(l.key)).length
  const line = course.lines.find((l) => l.key === (done?.key ?? queue[0]))
  // Lines still to come after the one on screen.
  const remaining = done ? queue.length : queue.length - 1

  function onDone(result: LineResult) {
    if (!line) return
    const g = gradeFor(result)
    const card = schedule(data?.cards.get(line.key) ?? null, g, new Date())
    setDone({ key: line.key, grade: g })
    setData((d) => (d ? { ...d, cards: new Map(d.cards).set(line.key, card) } : d))
    progress.saveReview(id, line.key, card).catch(() => {
      // The review could not be saved; practice still works and the line returns next visit.
    })
  }

  function next() {
    if (!done) return
    setReviewed((r) => new Set(r).add(done.key))
    setDone(null)
  }

  return (
    <main id="main" className="app app-wide">
      <p>
        <Link to={coursePath(course.id)}>Back to course</Link>
      </p>
      <h1>Practice: {course.name}</h1>
      {learnedHere === 0 ? (
        <p role="status">
          You have not learned any lines in this course yet.{' '}
          <Link to={coursePath(course.id)}>Learn some first</Link>.
        </p>
      ) : !line ? (
        <p role="status">
          {reviewed.size > 0
            ? `Done: you reviewed ${reviewed.size} ${reviewed.size === 1 ? 'line' : 'lines'}.`
            : 'Nothing to review right now. Come back later.'}
        </p>
      ) : (
        <>
          <p className="hint">
            {remaining} more {remaining === 1 ? 'line' : 'lines'} due after this one
          </p>
          <LinePlayer key={line.key} line={line} allowHint onDone={onDone} />
          {done && (
            <div className="panel">
              <p role="status">{GRADE_TEXT[done.grade]}</p>
              <div className="actions">
                <button type="button" className="btn btn-primary" onClick={next}>
                  {remaining > 0 ? 'Next line' : 'Finish'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  )
}
