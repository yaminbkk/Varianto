import type { OpeningLine } from './types'

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** A URL-safe key built from the ECO code and the name. Not unique on its own; see keyIndex. */
export function openingKey(line: OpeningLine): string {
  return `${line.eco.toLowerCase()}-${slug(line.name)}`
}

/** Maps each line to a unique key. Colliding keys get -2, -3, ... in library order. */
export function keyIndex(lines: readonly OpeningLine[]): Map<string, OpeningLine> {
  const index = new Map<string, OpeningLine>()
  for (const line of lines) {
    const base = openingKey(line)
    let key = base
    for (let n = 2; index.has(key); n++) key = `${base}-${n}`
    index.set(key, line)
  }
  return index
}
