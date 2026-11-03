import type { OpeningLine } from './types'

export function findOpenings(lines: readonly OpeningLine[], query: string): OpeningLine[] {
  const needle = query.trim().toLowerCase()
  if (needle === '') return [...lines]
  return lines.filter(
    (line) => line.name.toLowerCase().includes(needle) || line.eco.toLowerCase().includes(needle),
  )
}
