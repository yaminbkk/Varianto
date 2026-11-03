import type { Color } from '../repertoire/tree'
import { openingPositions, START_FEN } from '../openings/positions'
import type { Course } from './courses'
import { lineOwner } from './depth'

/**
 * The position that stands for a course on its card: the end of the line that carries the
 * course's own name (for example plain "Italian Game"), otherwise of its shortest line.
 * The board is shown from the side that owns that line, so a defence is seen from Black's side.
 */
export function courseThumbnail(course: Course): { fen: string; orientation: Color } {
  const named = course.lines.find((l) => l.line.name === course.name)
  const chosen =
    named ??
    course.lines.reduce<Course['lines'][number] | null>(
      (a, b) => (a && a.plies <= b.plies ? a : b),
      null,
    )
  const positions = chosen ? openingPositions(chosen.line) : []
  return {
    fen: positions[positions.length - 1]?.fen ?? START_FEN,
    orientation: chosen ? lineOwner(chosen.plies) : 'white',
  }
}
