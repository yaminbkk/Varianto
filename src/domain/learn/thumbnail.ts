import type { Color } from '../repertoire/tree'
import { openingPositions, START_FEN } from '../openings/positions'
import type { Course, CourseLine } from './courses'
import { lineOwner } from './depth'

/**
 * The line that stands for a course: the one that carries the course's own name (for example
 * plain "Italian Game"), otherwise its shortest line.
 */
function mainLine(course: Course): CourseLine | null {
  const named = course.lines.find((l) => l.line.name === course.name)
  if (named) return named
  return course.lines.reduce<CourseLine | null>((a, b) => (a && a.plies <= b.plies ? a : b), null)
}

/** The side an opening is played by: the owner of its main line, so a defence is Black's. */
export function naturalSide(course: Course): Color {
  const line = mainLine(course)
  return line ? lineOwner(line.plies) : 'white'
}

/**
 * The position that stands for a course on its card: the end of its main line, seen from the
 * side that plays the opening.
 */
export function courseThumbnail(course: Course): { fen: string; orientation: Color } {
  const line = mainLine(course)
  const positions = line ? openingPositions(line.line) : []
  return {
    fen: positions[positions.length - 1]?.fen ?? START_FEN,
    orientation: naturalSide(course),
  }
}
