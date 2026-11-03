import type { Course } from './courses'

/** The courses worth listing: everything except the names on the hidden list, in the same order. */
export function visibleCourses(
  courses: readonly Course[],
  hiddenNames: readonly string[],
): Course[] {
  const hidden = new Set(hiddenNames)
  return courses.filter((c) => !hidden.has(c.name))
}
