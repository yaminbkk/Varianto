import { sanSequence } from '../openings/parse'
import type { Course } from './courses'
import { naturalSide } from './thumbnail'

export type Category = 'white' | 'black' | 'e4' | 'd4' | 'others'

/** The filters of the catalog, in display order. */
export const CATEGORIES: readonly Category[] = ['white', 'black', 'e4', 'd4', 'others']

export const CATEGORY_LABELS: Record<Category, string> = {
  white: 'White',
  black: 'Black',
  e4: 'E4',
  d4: 'D4',
  others: 'Others',
}

/** The first move of the course's main line, such as "e4". */
export function firstMove(course: Course): string {
  const line =
    course.lines.find((l) => l.line.name === course.name) ??
    course.lines.reduce<Course['lines'][number] | null>(
      (a, b) => (a && a.plies <= b.plies ? a : b),
      null,
    )
  return line ? (sanSequence(line.line.pgn).split(' ')[0] ?? '') : ''
}

/** White and Black follow the side that plays the opening; E4, D4 and Others follow its first move. */
export function inCategory(course: Course, category: Category): boolean {
  switch (category) {
    case 'white':
    case 'black':
      return naturalSide(course) === category
    case 'e4':
    case 'd4':
      return firstMove(course) === category
    case 'others':
      return !['e4', 'd4'].includes(firstMove(course))
  }
}
