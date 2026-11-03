import { sanSequence } from '../openings/parse'
import type { OpeningLine } from '../openings/types'
import { explainMove } from './explain'

const TEXT_MIN = 20
const TEXT_MAX = 300

/** The key of a move: every move of the line up to and including `index`, so shared by all variations. */
export function prefixKey(sans: readonly string[], index: number): string {
  return sans.slice(0, index + 1).join(' ')
}

/** Curated, opening-specific text for the move when there is some; otherwise the computed explanation. */
export function explanationFor(
  curated: Readonly<Record<string, string>>,
  sans: readonly string[],
  index: number,
  fenBefore: string,
): string {
  return curated[prefixKey(sans, index)] ?? explainMove(fenBefore, sans[index] ?? '')
}

/** Returns the problems with the curated texts; empty when all are valid. */
export function validateExplanations(
  curated: Readonly<Record<string, string>>,
  lines: readonly OpeningLine[],
): string[] {
  const known = new Set<string>()
  for (const line of lines) {
    const sans = sanSequence(line.pgn).split(' ')
    for (let i = 0; i < sans.length; i++) known.add(prefixKey(sans, i))
  }
  const problems: string[] = []
  for (const [key, text] of Object.entries(curated)) {
    if (!known.has(key)) problems.push(`${key}: no library line plays this move path`)
    if (text.length < TEXT_MIN || text.length > TEXT_MAX) {
      problems.push(
        `${key}: text must be ${TEXT_MIN} to ${TEXT_MAX} characters, got ${text.length}`,
      )
    }
  }
  return problems
}
