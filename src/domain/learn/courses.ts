import { keyIndex, slug } from '../openings/key'
import { sanSequence } from '../openings/parse'
import type { OpeningLine } from '../openings/types'

export interface CourseLine {
  key: string
  line: OpeningLine
  plies: number
}

export interface Course {
  id: string
  name: string
  lines: CourseLine[]
  ecoFrom: string
  ecoTo: string
}

/** The course an opening belongs to: its name before the first colon. */
export function courseName(openingName: string): string {
  return (openingName.split(':')[0] ?? openingName).trim()
}

/** Groups the library into one course per opening family, sorted by name. */
export function coursesFrom(lines: readonly OpeningLine[]): Course[] {
  const keyOf = new Map<OpeningLine, string>()
  for (const [key, line] of keyIndex(lines)) keyOf.set(line, key)

  const byName = new Map<string, CourseLine[]>()
  for (const line of lines) {
    const name = courseName(line.name)
    const plies = sanSequence(line.pgn).split(' ').length
    byName.set(name, [...(byName.get(name) ?? []), { key: keyOf.get(line) ?? '', line, plies }])
  }

  return [...byName.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, courseLines]) => {
      const ecos = courseLines.map((l) => l.line.eco).sort()
      return {
        id: slug(name),
        name,
        lines: courseLines,
        ecoFrom: ecos[0] ?? '',
        ecoTo: ecos[ecos.length - 1] ?? '',
      }
    })
}
