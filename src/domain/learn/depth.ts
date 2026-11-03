import type { Color } from '../repertoire/tree'
import type { Course, CourseLine } from './courses'

export type Depth = 'essentials' | 'advanced' | 'full'

export const DEPTHS: readonly Depth[] = ['essentials', 'advanced', 'full']

export const DEPTH_MAX_PLIES: Record<Depth, number> = {
  essentials: 7,
  advanced: 11,
  full: Infinity,
}

/**
 * The side a line is for: the one that played its last move. The last move is where a line
 * departs from its family (for example "Italian Game: Paris Defense" ends on Black's ...d6),
 * so that side is the one who needs to learn it.
 */
export function lineOwner(plies: number): Color {
  return plies % 2 === 1 ? 'white' : 'black'
}

/** The learner's own lines within the depth, shortest first. */
export function linesFor(course: Course, depth: Depth, side: Color): CourseLine[] {
  return course.lines
    .filter((l) => l.plies <= DEPTH_MAX_PLIES[depth] && lineOwner(l.plies) === side)
    .map((l, order) => ({ l, order }))
    .sort((a, b) => a.l.plies - b.l.plies || a.order - b.order)
    .map(({ l }) => l)
}

/** The depths worth offering: each adds lines over the previous one. Empty when nothing is learnable. */
export function depthChoices(course: Course, side: Color): Depth[] {
  const choices: Depth[] = []
  let previous = 0
  for (const depth of DEPTHS) {
    const count = linesFor(course, depth, side).length
    if (count > previous) {
      choices.push(depth)
      previous = count
    }
  }
  // Levels that share the same lines collapse to the largest one.
  if (choices.length === 1) return ['full']
  return choices
}
