import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CATEGORIES,
  CATEGORY_LABELS,
  inCategory,
  type Category,
} from '../../domain/learn/categories'
import { courseThumbnail } from '../../domain/learn/thumbnail'
import { searchCourses } from '../../domain/learn/searchCourses'
import { visibleCourses } from '../../domain/learn/visibleCourses'
import hiddenCourses from '../../data/hidden-courses.json'
import { ecoFamily } from '../../domain/openings/ecoFamily'
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
  const [category, setCategory] = useState<Category | null>(null)
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
  const shown = useMemo(() => {
    const found = courses ? searchCourses(courses, query) : []
    return category ? found.filter((c) => inCategory(c, category)) : found
  }, [courses, query, category])
  const categoryCounts = useMemo(
    () =>
      Object.fromEntries(
        CATEGORIES.map((c) => [c, courses ? courses.filter((x) => inCategory(x, c)).length : 0]),
      ) as Record<Category, number>,
    [courses],
  )

  return (
    <>
      <SkipLink targetRef={mainRef} />
      <main id="main" ref={mainRef} tabIndex={-1} className="app">
        <header className="hero">
          <h1>Learn openings</h1>
          <p className="hint">Pick an opening and play its moves. Mistakes cost nothing.</p>
          {courses && (
            <ul className="stats">
              <li className="stat">{courses.length} openings</li>
              <li className="stat">
                {courses.reduce((n, c) => n + c.lines.length, 0).toLocaleString('en-US')} lines
              </li>
              <li className="stat">{[...counts.values()].reduce((n, c) => n + c, 0)} learned</li>
            </ul>
          )}
        </header>
        <div className="field">
          <label htmlFor={searchId}>Search by name, variation, or ECO code</label>
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-describedby={statusId}
            autoComplete="off"
            disabled={courses === null}
          />
        </div>
        <div className="chips" role="group" aria-label="Filter openings">
          <button
            type="button"
            className="chip"
            aria-pressed={category === null}
            onClick={() => setCategory(null)}
          >
            All
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              className="chip"
              aria-pressed={category === c}
              onClick={() => setCategory(category === c ? null : c)}
            >
              {CATEGORY_LABELS[c]}
              {courses && <span className="chip-count">{categoryCounts[c]}</span>}
            </button>
          ))}
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
        {shown.length > 0 && (
          <ul className="course-grid">
            {shown.map((course) => {
              const done = course.parentId ? null : (counts.get(course.id) ?? 0)
              const thumb = courseThumbnail(course)
              return (
                <li key={course.id}>
                  <Link className="course-card" to={coursePath(course.id)}>
                    <MiniBoard fen={thumb.fen} orientation={thumb.orientation} />
                    <span className="course-name">{course.name}</span>
                    <span className="course-meta">
                      <span className="eco">
                        {course.ecoFrom === course.ecoTo
                          ? course.ecoFrom
                          : `${course.ecoFrom}-${course.ecoTo}`}
                      </span>{' '}
                      · {ecoFamily(course.ecoFrom)}
                    </span>
                    <span className="course-meta">
                      {course.lines.length} {course.lines.length === 1 ? 'line' : 'lines'}
                      {done !== null && ` · ${done} learned`}
                    </span>
                    {done !== null && (
                      <span className="meter" aria-hidden="true">
                        <span
                          style={{ width: `${Math.round((done / course.lines.length) * 100)}%` }}
                        />
                      </span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </>
  )
}
