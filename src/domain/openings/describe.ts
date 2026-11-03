import { ecoFamily } from './ecoFamily'
import { openingKey } from './key'
import { openingPositions } from './positions'
import type { OpeningLine } from './types'

export interface OpeningDescription {
  summary: string
  ideas?: string[]
}

export interface OpeningInfo {
  title: string
  family: string
  moveCount: number
  mainLine: string
  description: OpeningDescription | null
}

/**
 * Combines the facts computed from the line with the curated description, if any.
 * Descriptions are keyed by openingKey(line). Lines whose key collides with an earlier
 * line (a "-2" key in keyIndex) have no curated description.
 */
export function describeOpening(
  line: OpeningLine,
  descriptions: Readonly<Record<string, OpeningDescription>>,
): OpeningInfo {
  return {
    title: line.name,
    family: ecoFamily(line.eco),
    moveCount: openingPositions(line).length,
    mainLine: line.pgn,
    description: descriptions[openingKey(line)] ?? null,
  }
}
