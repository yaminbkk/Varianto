import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { Course } from '../domain/learn/courses'
import { resolveCourse } from '../domain/learn/variants'
import { learnPath } from './paths'
import { useCourses } from './useCourses'

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

/** Finds the course named in the URL and handles loading, failure, and "not found" for its pages. */
export default function CourseGate({ children }: { children: (course: Course) => ReactNode }) {
  const { courseId = '' } = useParams()
  const state = useCourses()

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
        <p role="status">Loading course...</p>
      </Shell>
    )
  }
  const course = resolveCourse(state.courses, courseId)
  if (!course) {
    return (
      <Shell>
        <h1>Course not found</h1>
        <p>That course is not in the library.</p>
      </Shell>
    )
  }
  return <>{children(course)}</>
}
