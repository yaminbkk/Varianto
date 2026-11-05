import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Course } from '../../domain/learn/courses'
import {
  currentKey,
  DEFAULT_DRILL_MS,
  DRILL_DURATIONS_MS,
  drillResult,
  isOver,
  recordLine,
  startDrill,
  timeLeftMs,
  type DrillResult,
  type DrillState,
} from '../../domain/learn/drill'
import { progressId } from '../../domain/learn/variants'
import type { DrillRecord } from '../../storage/progress'
import CourseGate from '../CourseGate'
import LinePlayer from '../LinePlayer'
import { coursePath } from '../paths'
import { useProgress } from '../useProgress'

const nowMs = () => Date.now()

function clock(ms: number): string {
  const total = Math.ceil(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/** A timed run through the learned lines of a course: as many as possible before time runs out. */
export default function DrillPage() {
  return <CourseGate>{(course) => <Drill key={course.id} course={course} />}</CourseGate>
}

function Drill({ course }: { course: Course }) {
  const progress = useProgress()
  const id = progressId(course)
  const durationName = useId()
  const [learned, setLearned] = useState<ReadonlySet<string> | null>(null)
  const [history, setHistory] = useState<DrillRecord[]>([])
  const [durationMs, setDurationMs] = useState<number>(DEFAULT_DRILL_MS)
  const [drill, setDrill] = useState<DrillState | null>(null)
  const [now, setNow] = useState(0)
  const [finished, setFinished] = useState<{ result: DrillResult; isBest: boolean } | null>(null)
  const saved = useRef(false)
  // The best passed count before the drill in progress; read when it finishes.
  const bestRef = useRef(0)

  useEffect(() => {
    let alive = true
    Promise.all([progress.learnedLines(id), progress.drillResults(id)]).then(
      ([set, results]) => {
        if (!alive) return
        setLearned(set)
        setHistory(results)
        bestRef.current = results.reduce((max, r) => Math.max(max, r.passed), 0)
      },
      () => {
        if (alive) setLearned(new Set())
      },
    )
    return () => {
      alive = false
    }
  }, [progress, id])

  // Ends the drill: shows the result and stores it, once.
  const finish = useCallback(
    (state: DrillState, at: number) => {
      if (saved.current) return
      saved.current = true
      const result = drillResult(state, at)
      setFinished({ result, isBest: result.passed > bestRef.current })
      bestRef.current = Math.max(bestRef.current, result.passed)
      setHistory((h) => [{ ...result, at }, ...h])
      progress.addDrillResult(id, result, at).catch(() => {
        // The result could not be saved; the screen still shows it.
      })
    },
    [progress, id],
  )

  // Tick while a drill runs; time running out ends it.
  const running = drill !== null && finished === null
  useEffect(() => {
    if (!running || !drill) return
    const timer = window.setInterval(() => {
      const at = nowMs()
      setNow(at)
      if (isOver(drill, at)) finish(drill, at)
    }, 250)
    return () => window.clearInterval(timer)
  }, [running, drill, finish])

  if (learned === null) {
    return (
      <main id="main" className="app">
        <p role="status">Loading drill...</p>
      </main>
    )
  }

  const lines = course.lines.filter((l) => learned.has(l.key))
  const best = history.reduce((max, r) => Math.max(max, r.passed), 0)

  function lineEnded(passed: boolean) {
    if (!drill) return
    const next = recordLine(drill, passed)
    setDrill(next)
    const at = nowMs()
    if (isOver(next, at)) finish(next, at)
  }

  function start() {
    saved.current = false
    setFinished(null)
    const startedAt = nowMs()
    setNow(startedAt)
    setDrill(
      startDrill(
        lines.map((l) => l.key),
        durationMs,
        startedAt,
      ),
    )
  }

  const line = drill && !finished ? lines.find((l) => l.key === currentKey(drill)) : undefined

  return (
    <main id="main" className="app app-wide">
      <p>
        <Link to={coursePath(course.id)}>Back to course</Link>
      </p>
      <h1>Drill: {course.name}</h1>

      {lines.length === 0 ? (
        <p role="status">
          You have not learned any lines in this course yet.{' '}
          <Link to={coursePath(course.id)}>Learn some first</Link>.
        </p>
      ) : drill && !finished ? (
        <>
          <p className="hint">
            <span role="timer" aria-label="Time left">
              {clock(timeLeftMs(drill, now))}
            </span>{' '}
            · {drill.passed} passed · {drill.failed} missed
          </p>
          {line ? (
            <LinePlayer
              key={line.key}
              line={line}
              allowHint={false}
              onDone={() => lineEnded(true)}
              onFail={() => lineEnded(false)}
            />
          ) : (
            <p role="status">Finishing...</p>
          )}
        </>
      ) : finished ? (
        <section className="panel" aria-labelledby={`${durationName}-result`}>
          <h2 id={`${durationName}-result`}>Time!</h2>
          <p role="status">
            {finished.result.passed} passed, {finished.result.failed} missed in{' '}
            {clock(finished.result.elapsedMs)}.{finished.isBest ? ' That is your best so far.' : ''}
          </p>
          <div className="actions">
            <button type="button" className="btn btn-primary" onClick={start}>
              Drill again
            </button>
            <Link className="btn" to={coursePath(course.id)}>
              Back to course
            </Link>
          </div>
        </section>
      ) : (
        <section className="panel" aria-labelledby={`${durationName}-title`}>
          <h2 id={`${durationName}-title`}>Set up your drill</h2>
          <p>
            Play as many of your {lines.length} learned {lines.length === 1 ? 'line' : 'lines'} as
            you can before time runs out. A wrong move counts as a miss and moves on.
          </p>
          <fieldset>
            <legend>Time</legend>
            {DRILL_DURATIONS_MS.map((ms) => (
              <label key={ms}>
                <input
                  type="radio"
                  name={durationName}
                  checked={ms === durationMs}
                  onChange={() => setDurationMs(ms)}
                />{' '}
                {ms / 60_000} {ms === 60_000 ? 'minute' : 'minutes'}{' '}
              </label>
            ))}
          </fieldset>
          {best > 0 && <p className="hint">Your best: {best} lines passed.</p>}
          <div className="actions">
            <button type="button" className="btn btn-primary" onClick={start}>
              Start drill
            </button>
          </div>
        </section>
      )}
    </main>
  )
}
