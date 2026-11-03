import { createRepertoire, type Color, type IdFactory, type Repertoire } from '../repertoire/tree'
import { addOpeningToRepertoire } from './addToRepertoire'
import type { OpeningLine } from './types'

/**
 * Creates a new repertoire named after the opening, holding the opening's moves.
 *
 * @throws if the line's movetext is invalid.
 */
export function repertoireFromOpening(
  line: OpeningLine,
  color: Color,
  newId: IdFactory,
): Repertoire {
  const rep = createRepertoire(line.name, color, newId)
  return addOpeningToRepertoire(rep, line, newId).repertoire
}
