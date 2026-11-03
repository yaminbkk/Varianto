import type { OpeningDescription } from './describe'
import { keyIndex, openingKey } from './key'
import { sanSequence } from './parse'
import type { OpeningLine } from './types'

const SUMMARY_MIN = 40
const SUMMARY_MAX = 400
const MAX_IDEAS = 3
const IDEA_MAX = 160

function stripCheck(san: string): string {
  return san.replace(/[+#]$/, '')
}

function backtickedMoves(text: string): string[] {
  return [...text.matchAll(/`([^`]+)`/g)].map((m) => m[1] ?? '')
}

/** Returns a list of problems with the descriptions; empty when all are valid. */
export function validateDescriptions(
  descriptions: Readonly<Record<string, OpeningDescription>>,
  lines: readonly OpeningLine[],
): string[] {
  const index = keyIndex(lines)
  const problems: string[] = []
  for (const [key, entry] of Object.entries(descriptions)) {
    const line = index.get(key)
    if (!line) {
      problems.push(`${key}: no such opening`)
      continue
    }
    if (openingKey(line) !== key) {
      problems.push(`${key}: key collides with an earlier opening and cannot be described`)
      continue
    }
    const len = entry.summary.length
    if (len < SUMMARY_MIN || len > SUMMARY_MAX) {
      problems.push(
        `${key}: summary must be ${SUMMARY_MIN} to ${SUMMARY_MAX} characters, got ${len}`,
      )
    }
    const ideas = entry.ideas ?? []
    if (ideas.length > MAX_IDEAS) problems.push(`${key}: at most ${MAX_IDEAS} ideas`)
    for (const idea of ideas) {
      if (idea.length > IDEA_MAX) problems.push(`${key}: an idea is over ${IDEA_MAX} characters`)
    }
    const played = new Set(sanSequence(line.pgn).split(' ').map(stripCheck))
    for (const text of [entry.summary, ...ideas]) {
      for (const move of backtickedMoves(text)) {
        if (!played.has(stripCheck(move))) problems.push(`${key}: move ${move} is not in the line`)
      }
    }
  }
  return problems
}
