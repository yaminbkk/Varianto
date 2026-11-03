import { importPgn } from '../pgn/pgn'
import type { IdFactory, Repertoire } from '../repertoire/tree'
import type { OpeningLine } from './types'

/**
 * Copies an opening line into `rep` as move nodes. Moves the repertoire already
 * has are reused, so adding the same line twice does not duplicate branches.
 * Returns a new repertoire; `rep` is not mutated.
 *
 * @throws if the line's movetext is invalid, or if the repertoire's root is not
 * the standard start position ("Game starts from a different position than the
 * repertoire"), because `importPgn` rejects both.
 */
export function addOpeningToRepertoire(
  rep: Repertoire,
  line: OpeningLine,
  newId: IdFactory,
): { repertoire: Repertoire; games: number } {
  return importPgn(rep, line.pgn, newId)
}
