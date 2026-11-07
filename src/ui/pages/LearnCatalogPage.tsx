import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CATEGORY_LABELS,
  MOVE_CATEGORIES,
  SIDE_CATEGORIES,
  filterCourses,
  inCategory,
  type MoveCategory,
  type SideCategory,
} from '../../domain/learn/categories'
import { courseThumbnail } from '../../domain/learn/thumbnail'
import { searchCourses, searchCoursesByMoves } from '../../domain/learn/searchCourses'
import { visibleCourses } from '../../domain/learn/visibleCourses'
import hiddenCourses from '../../data/hidden-courses.json'
import { groupByVolume, inProgress } from '../../domain/learn/volumes'
import type { Course } from '../../domain/learn/courses'
import MiniBoard from '../MiniBoard'
import { coursePath } from '../paths'
import SkipLink from '../SkipLink'
import { useCourses } from '../useCourses'
import { useProgress } from '../useProgress'

/** Every opening family as a course the learner can study. */
export default function LearnCatalogPage() {
  const state = useCourses()
  const progress = useProgress()
  const searchId = useId()
  const statusId = useId()
  const mainRef = useRef<HTMLElement>(null)
  const [query, setQuery] = useState('')
  const [byMoves, setByMoves] = useState(false)
  const [side, setSide] = useState<SideCategory | null>(null)
  const [move, setMove] = useState<MoveCategory | null>(null)
  const [counts, setCounts] = useState<Map<string, number>>(new Map())

  useEffect(() => {
    let alive = true
    progress.learnedCounts().then(
      (c) => {
        if (alive) setCounts(c)
      },
      () => {},
    )
    return () => {
      alive = false
    }
  }, [progress])

  // Obscure and fragment courses stay in the data and reachable by link, but are not listed.
  const courses = useMemo(
    () => (state.status === 'ready' ? visibleCourses(state.courses, hiddenCourses) : null),
    [state],
  )
  const shown = useMemo(
    () =>
      filterCourses(
        courses
          ? byMoves
            ? searchCoursesByMoves(courses, query)
            : searchCourses(courses, query)
          : [],
        side,
        move,
      ),
    [courses, query, byMoves, side, move],
  )
  // Side counts cover everything; first-move counts cover the chosen side.
  const sideCounts = useMemo(
    () =>
      Object.fromEntries(
        SIDE_CATEGORIES.map((c) => [
          c,
          courses ? courses.filter((x) => inCategory(x, c)).length : 0,
        ]),
      ) as Record<SideCategory, number>,
    [courses],
  )
  const moveCounts = useMemo(
    () =>
      Object.fromEntries(
        MOVE_CATEGORIES.map((c) => [c, courses ? filterCourses(courses, side, c).length : 0]),
      ) as Record<MoveCategory, number>,
    [courses, side],
  )

  const groups = useMemo(() => groupByVolume(shown), [shown])
  const browsing = query === '' && side === null && move === null
  const resume = useMemo(
    () => (courses && browsing ? inProgress(courses, counts) : []),
    [courses, counts, browsing],
  )

  return (
    <>
      <SkipLink targetRef={mainRef} />
      <main id="main" ref={mainRef} tabIndex={-1} className="app">
        <header className="page-head">
          <h1>Learn openings</h1>
          {courses && (
            <p className="page-stats">
              {courses.length} openings · {totalLines(courses)} lines ·{' '}
              {[...counts.values()].reduce((n, c) => n + c, 0)} learned
            </p>
          )}
        </header>
        {resume.length > 0 && (
          <section className="resume" aria-labelledby="resume-heading">
            <h2 id="resume-heading">Continue</h2>
            <ul className="resume-list">
              {resume.map((course) => (
                <li key={course.id}>
                  <Link className="resume-card" to={coursePath(course.id)}>
                    <span className="course-name">{course.name}</span>
                    <span className="course-meta figures">
                      {counts.get(course.id) ?? 0} of {course.lines.length} lines learned
                    </span>
                    <ProgressMeter done={counts.get(course.id) ?? 0} total={course.lines.length} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        <div className="field">
          <label htmlFor={searchId}>
            {byMoves
              ? 'Search by moves, for example 1.e4 e5 2.Nf3'
              : 'Search by name, variation, or ECO code'}
          </label>
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-describedby={statusId}
            autoComplete="off"
            disabled={courses === null}
          />
          <label className="check">
            <input
              type="checkbox"
              checked={byMoves}
              onChange={(e) => setByMoves(e.target.checked)}
            />
            Search by moves
          </label>
        </div>
        <div className="filters">
          <div className="filter-group">
            <span className="filter-label" aria-hidden="true">
              Side
            </span>
            <div className="chips" role="group" aria-label="Filter by side">
              <button
                type="button"
                className="chip"
                aria-pressed={side === null}
                onClick={() => setSide(null)}
              >
                All
              </button>
              {SIDE_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="chip"
                  aria-pressed={side === c}
                  onClick={() => setSide(side === c ? null : c)}
                >
                  {CATEGORY_LABELS[c]}
                  {courses && <span className="chip-count">{sideCounts[c]}</span>}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-group">
            <span className="filter-label" aria-hidden="true">
              First move
            </span>
            <div className="chips" role="group" aria-label="Filter by first move">
              <button
                type="button"
                className="chip"
                aria-pressed={move === null}
                onClick={() => setMove(null)}
              >
                Any
              </button>
              {MOVE_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="chip"
                  aria-pressed={move === c}
                  onClick={() => setMove(move === c ? null : c)}
                >
                  {CATEGORY_LABELS[c]}
                  {courses && <span className="chip-count">{moveCounts[c]}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
        {state.status === 'failed' ? (
          <div role="alert" className="alert">
            <p>The opening library could not be loaded.</p>
            <button type="button" className="btn" onClick={state.retry}>
              Try again
            </button>
          </div>
        ) : (
          <p id={statusId} className="hint" role="status">
            {courses === null
              ? 'Loading courses...'
              : shown.length === 0
                ? 'No courses match your search.'
                : `${shown.length} ${shown.length === 1 ? 'course' : 'courses'}.`}
          </p>
        )}
        {groups.map((group) => (
          <section
            key={group.volume}
            className="volume"
            data-volume={group.volume}
            aria-labelledby={`volume-${group.volume}`}
          >
            <h2 id={`volume-${group.volume}`} className="volume-title">
              <span className="volume-letter" aria-hidden="true">
                {group.volume === 'Other' ? '?' : group.volume}
              </span>
              {group.label.replace(/ \([A-E]\)$/, '')}
              <span className="volume-count">{group.courses.length}</span>
            </h2>
            <ul className="course-grid">
              {group.courses.map((course) => (
                <CourseCard key={course.id} course={course} done={counts.get(course.id) ?? 0} />
              ))}
            </ul>
          </section>
        ))}
      </main>
    </>
  )
}

function totalLines(courses: readonly Course[]): string {
  return courses.reduce((n, c) => n + c.lines.length, 0).toLocaleString('en-US')
}

function ProgressMeter({ done, total }: { done: number; total: number }) {
  return (
    <span className="meter" aria-hidden="true">
      <span style={{ width: `${Math.round((done / total) * 100)}%` }} />
    </span>
  )
}

function CourseCard({ course, done }: { course: Course; done: number }) {
  const thumb = courseThumbnail(course)
  // A variant course has no progress of its own: it is recorded under its family.
  const started = !course.parentId && done > 0
  return (
    <li>
      <Link className="course-card" to={coursePath(course.id)}>
        <MiniBoard fen={thumb.fen} orientation={thumb.orientation} />
        <span className="course-name">{course.name}</span>
        <span className="course-meta figures">
          <span className="eco">
            {course.ecoFrom === course.ecoTo ? course.ecoFrom : `${course.ecoFrom}-${course.ecoTo}`}
          </span>{' '}
          · {course.lines.length} {course.lines.length === 1 ? 'line' : 'lines'}
          {started && ` · ${done} learned`}
        </span>
        {started && <ProgressMeter done={done} total={course.lines.length} />}
      </Link>
    </li>
  )
}
