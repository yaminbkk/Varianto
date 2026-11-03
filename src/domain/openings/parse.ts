import { Chess } from 'chess.js'
import type { OpeningLine } from './types'

const RESULT_TOKENS = new Set(['1-0', '0-1', '1/2-1/2', '*'])

function stripResult(pgn: string): string {
  const tokens = pgn.split(/\s+/).filter((t) => t !== '')
  const last = tokens[tokens.length - 1]
  if (last !== undefined && RESULT_TOKENS.has(last)) tokens.pop()
  return tokens.join(' ')
}

function validateMoves(pgn: string): string | null {
  const chess = new Chess()
  for (const token of pgn.split(' ')) {
    const san = token.replace(/^\d+\.+/, '')
    if (san === '') continue
    try {
      chess.move(san, { strict: true })
    } catch {
      return `illegal move "${san}"`
    }
  }
  return null
}

export function sanSequence(pgn: string): string {
  return pgn
    .split(/\s+/)
    .map((t) => t.replace(/^\d+\.+/, ''))
    .filter((t) => t !== '')
    .join(' ')
}

export function parseOpeningsTsv(text: string, sourceLabel: string): OpeningLine[] {
  const lines = text.split('\n')
  const header = (lines[0] ?? '').replace(/\r$/, '').trim().split('\t')
  if (header.join('\t') !== 'eco\tname\tpgn') {
    throw new Error(
      `${sourceLabel}:1: expected header "eco\tname\tpgn", got "${header.join('\t')}"`,
    )
  }
  const seen = new Set<string>()
  const result: OpeningLine[] = []

  for (let i = 1; i < lines.length; i++) {
    const lineNumber = i + 1
    const raw = (lines[i] ?? '').replace(/\r$/, '')
    if (raw.trim() === '') continue

    const fail = (reason: string): never => {
      throw new Error(`${sourceLabel}:${lineNumber}: ${reason}`)
    }

    const cells = raw.split('\t')
    const [ecoCell, nameCell, pgnCell] = cells
    if (
      cells.length !== 3 ||
      ecoCell === undefined ||
      nameCell === undefined ||
      pgnCell === undefined
    ) {
      return fail(`expected 3 tab-separated cells, got ${cells.length}`)
    }
    const eco = ecoCell.trim()
    const name = nameCell.trim()
    const pgn = stripResult(pgnCell.trim())

    if (eco === '') fail('empty eco cell')
    if (name === '') fail('empty name cell')
    if (pgn === '') fail('empty pgn cell')

    const problem = validateMoves(pgn)
    if (problem !== null) fail(problem)

    const key = `${eco}\u0000${name}\u0000${sanSequence(pgn)}`
    if (seen.has(key)) {
      throw new Error(`Duplicate opening ${eco} "${name}" at ${sourceLabel}:${lineNumber}`)
    }
    seen.add(key)

    result.push({ eco, name, pgn })
  }

  return result
}
