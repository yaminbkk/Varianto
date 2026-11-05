import { sideToMove } from '../repertoire/squares'
import type { Evaluation } from './types'

/**
 * Reads an engine `info` line into an evaluation from White's point of view.
 * Engines report scores for the side to move, so the sign flips when Black is to move.
 * Returns null for any other line, and for scores that are only a bound.
 */
export function parseInfoLine(line: string, fen: string): Evaluation | null {
  const tokens = line.trim().split(/\s+/)
  if (tokens[0] !== 'info') return null
  const scoreAt = tokens.indexOf('score')
  if (scoreAt < 0) return null
  const kind = tokens[scoreAt + 1]
  const raw = Number(tokens[scoreAt + 2])
  if ((kind !== 'cp' && kind !== 'mate') || !Number.isFinite(raw)) return null
  const bound = tokens[scoreAt + 3]
  if (bound === 'lowerbound' || bound === 'upperbound') return null
  const depthAt = tokens.indexOf('depth')
  const depth = depthAt < 0 ? 0 : Number(tokens[depthAt + 1])
  if (!Number.isFinite(depth)) return null
  const value = sideToMove(fen) === 'black' ? -raw : raw
  return { kind, value, depth }
}
