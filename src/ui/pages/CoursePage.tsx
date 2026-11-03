import { useEffect, useId, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { Course } from '../../domain/learn/courses'
import { depthChoices, linesFor, type Depth } from '../../domain/learn/depth'
import { courseProgress } from '../../domain/learn/nextLine'
import type { OpeningDescription } from '../../domain/openings/describe'
import type { Color } from '../../domain/repertoire/tree'
import { learnPath, lessonPath } from '../paths'
import SideField from '../SideField'
import SkipLink from '../SkipLink'
import { useCourses } from '../useCourses'
import { useProgress } from '../useProgress'

const DEPTH_LABELS: Record<Depth, string> = {
  essentials: 'Essentials',
  advanced: 'Advanced',
  full: 'Full',
}

/** One course: choose a side and a depth, see progress, and start or continue. */
export default function CoursePage() {
  const { courseId = '' } = useParams()
  const state = useCourses()
  const course = state.status === 'ready' ? state.courses.find((c) => c.id === courseId) : undefined

  const back = (
    <p>
      <Link to={learnPath}>Back to all courses</Link>
    </p>
  )

  if (state.status === 'failed') {
    return (
      <main id="main" className="app">
        {back}
        <div role="alert" className="alert">
          <p>The opening library could not be loaded.</p>
          <button type="button" className="btn" onClick={state.retry}>
            Try again
          </button>
        </div>
      </main>
    )
  }
  if (state.status === 'loading') {
    return (
      <main id="main" className="app">
        {back}
        <p role="status">Loading course...</p>
      </main>
    )
  }
  if (!course) {
    return (
      <main id="main" className="app">
        {back}
        <h1>Course not found</h1>
        <p>That course is not in the library.</p>
      </main>
    )
  }
  return <CourseView key={course.id} course={course} back={back} />
}

function CourseView({ course, back }: { course: Course; back: React.ReactNode }) {
  const progress = useProgress()
  const mainRef = useRef<HTMLElement>(null)
  const depthName = useId()
  const [side, setSide] = useState<Color>('white')
  const [depthPick, setDepthPick] = useState<Depth | null>(null)
  const [learned, setLearned] = useState<ReadonlySet<string>>(new Set())
  const [description, setDescription] = useState<OpeningDescription | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    let alive = true
    progress.learnedLines(course.id).then(
      (set) => {
        if (alive) setLearned(set)
      },
      () => {},
    )
    return () => {
      alive = false
    }
  }, [progress, course.id])

  useEffect(() => {
    let alive = true
    const baseKey = course.lines.find((l) => l.line.name === course.name)?.key
    import('../../data/opening-descriptions.json').then(
      (mod) => {
        const all = mod.default as Record<string, OpeningDescription>
        if (alive && baseKey) setDescription(all[baseKey] ?? null)
      },
      () => {},
    )
    return () => {
      alive = false
    }
  }, [course])

  const choices = depthChoices(course, side)
  const depth: Depth | null =
    depthPick && choices.includes(depthPick) ? depthPick : (choices[0] ?? null)
  const { done, total } = depth
    ? courseProgress(course, depth, side, learned)
    : { done: 0, total: 0 }

  async function reset() {
    await progress.reset(course.id)
    setLearned(new Set())
    setConfirmReset(false)
  }

  return (
    <>
      <SkipLink targetRef={mainRef} />
      <main id="main" ref={mainRef} tabIndex={-1} className="app">
        {back}
        <h1>{course.name}</h1>
        <p className="hint">
          <span className="eco">
            {course.ecoFrom === course.ecoTo ? course.ecoFrom : `${course.ecoFrom}-${course.ecoTo}`}
          </span>{' '}
          · {course.lines.length} {course.lines.length === 1 ? 'line' : 'lines'}
        </p>
        {description && <p>{description.summary}</p>}

        <section className="panel" aria-labelledby={`${depthName}-title`}>
          <h2 id={`${depthName}-title`}>Set up your lesson</h2>
          <SideField name="course-side" value={side} onChange={setSide} />
          {depth === null ? (
            <p>This course has no lines you can play as {side === 'white' ? 'White' : 'Black'}.</p>
          ) : (
            <>
              <fieldset className="field">
                <legend>How deep do you want to go?</legend>
                <div className="choices">
                  {choices.map((d) => (
                    <label key={d} className="choice">
                      <input
                        type="radio"
                        name={depthName}
                        checked={d === depth}
                        onChange={() => setDepthPick(d)}
                      />
                      {DEPTH_LABELS[d]} ({linesFor(course, d, side).length} lines)
                    </label>
                  ))}
                </div>
              </fieldset>
              <p className="hint" role="status">
                {done} of {total} lines learned.
              </p>
              {done < total ? (
                <Link className="btn btn-primary" to={lessonPath(course.id, depth, side)}>
                  {done === 0 ? 'Start' : 'Continue'}
                </Link>
              ) : (
                <p>You have learned every line at this depth.</p>
              )}
            </>
          )}
        </section>

        {learned.size > 0 && (
          <section className="panel">
            {confirmReset ? (
              <div role="alert">
                <p>Forget all progress in this course?</p>
                <div className="actions">
                  <button type="button" className="btn" onClick={() => void reset()}>
                    Yes, reset
                  </button>
                  <button type="button" className="btn" onClick={() => setConfirmReset(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="btn" onClick={() => setConfirmReset(true)}>
                Reset progress
              </button>
            )}
          </section>
        )}
      </main>
    </>
  )
}
