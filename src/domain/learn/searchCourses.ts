import { sanSequence } from '../openings/parse'
import type { Course } from './courses'
import { variantCourses } from './variants'

function matchesAll(course: Course, tokens: readonly string[]): boolean {
  const haystack = `${course.name} ${course.ecoFrom} ${course.ecoTo}`.toLowerCase()
  return tokens.every((t) => haystack.includes(t))
}

/**
 * Courses matching the query: every word must appear in the name or ECO code.
 * A variation course is listed only when the query says something about the variation itself,
 * so "sicilian" finds the family and "najdorf" or "sicilian najdorf" finds the variation.
 */
export function searchCourses(families: readonly Course[], query: string): Course[] {
  const tokens = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t !== '')
  if (tokens.length === 0) return [...families]

  const found: Course[] = []
  for (const family of families) {
    const familyMatches = matchesAll(family, tokens)
    if (familyMatches) found.push(family)
    else
      for (const variant of variantCourses(family)) {
        if (matchesAll(variant, tokens)) found.push(variant)
      }
  }
  return found
}

/**
 * Courses having a line that starts with the given moves, for example "1.e4 e5 2.Nf3" or "e4 e5 Nf3".
 * Move numbers are ignored. Variation courses are not searched by moves in this version.
 */
export function searchCoursesByMoves(families: readonly Course[], moves: string): Course[] {
  const tokens = sanSequence(moves)
    .split(' ')
    .filter((t) => t !== '')
  if (tokens.length === 0) return [...families]

  return families.filter((family) =>
    family.lines.some((courseLine) => {
      const lineMoves = sanSequence(courseLine.line.pgn).split(' ')
      return tokens.length <= lineMoves.length && tokens.every((t, i) => lineMoves[i] === t)
    }),
  )
}
