import type { Color } from '../repertoire/tree'
import type { Course, CourseLine } from './courses'
import { linesFor, type Depth } from './depth'

/** The first line within the depth that the learner has not learned yet, or null when none is left. */
export function nextLine(
  course: Course,
  depth: Depth,
  side: Color,
  learned: ReadonlySet<string>,
): CourseLine | null {
  return linesFor(course, depth, side).find((l) => !learned.has(l.key)) ?? null
}

/** How many of the lines within the depth are learned. */
export function courseProgress(
  course: Course,
  depth: Depth,
  side: Color,
  learned: ReadonlySet<string>,
): { done: number; total: number } {
  const lines = linesFor(course, depth, side)
  return { done: lines.filter((l) => learned.has(l.key)).length, total: lines.length }
}
