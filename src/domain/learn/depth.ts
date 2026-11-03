import type { Color } from '../repertoire/tree'
import type { Course, CourseLine } from './courses'

export type Depth = 'essentials' | 'advanced' | 'full'

export const DEPTHS: readonly Depth[] = ['essentials', 'advanced', 'full']

export const DEPTH_MAX_PLIES: Record<Depth, number> = {
  essentials: 7,
  advanced: 11,
  full: Infinity,
}

/** How many of a line's plies the learner plays: White plays plies 1, 3, ..., Black plies 2, 4, .... */
export function learnerMoves(plies: number, side: Color): number {
  return side === 'white' ? Math.ceil(plies / 2) : Math.floor(plies / 2)
}

/** Lines within the depth where the learner has at least one move, shortest first. */
export function linesFor(course: Course, depth: Depth, side: Color): CourseLine[] {
  return course.lines
    .filter((l) => l.plies <= DEPTH_MAX_PLIES[depth] && learnerMoves(l.plies, side) >= 1)
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
