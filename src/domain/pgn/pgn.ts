import { parse } from '@mliebelt/pgn-parser'
import { DEFAULT_POSITION } from 'chess.js'
import {
  addMove,
  getChildren,
  getNode,
  positionKey,
  setComment,
  type IdFactory,
  type MoveNode,
  type Repertoire,
} from '../repertoire/tree'

interface ParsedMove {
  notation: { notation: string }
  commentAfter?: string | null
  commentDiag?: { comment?: string } | null
  variations: ParsedMove[][]
}

interface ParsedGame {
  tags?: Record<string, string>
  moves: ParsedMove[]
}

function cleanComment(raw: string): string {
  return raw
    .replace(/\[%[^\]]*\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function writeComment(raw: string): string {
  return raw.replace(/[{}]/g, '').replace(/\s+/g, ' ').trim()
}

function importMoves(
  rep: Repertoire,
  startParentId: string,
  moves: ParsedMove[],
  newId: IdFactory,
): Repertoire {
  let current = rep
  let parent = startParentId
  for (const move of moves) {
    const added = addMove(current, parent, move.notation.notation, newId)
    current = added.repertoire

    const comment = cleanComment(move.commentAfter ?? move.commentDiag?.comment ?? '')
    if (comment) current = setComment(current, added.nodeId, comment)

    for (const variation of move.variations) {
      current = importMoves(current, parent, variation, newId)
    }
    parent = added.nodeId
  }
  return current
}

/**
 * Merges every game in `pgnText` into `rep`. Shared moves are reused, so
 * importing overlapping games does not duplicate branches.
 */
export function importPgn(
  rep: Repertoire,
  pgnText: string,
  newId: IdFactory,
): { repertoire: Repertoire; games: number } {
  let games: ParsedGame[]
  try {
    games = parse(pgnText, { startRule: 'games' }) as unknown as ParsedGame[]
  } catch (error) {
    throw new Error(`Invalid PGN: ${error instanceof Error ? error.message : String(error)}`)
  }

  const rootFen = getNode(rep, rep.rootId).fen
  let current = rep
  for (const game of games) {
    const start = game.tags?.FEN ?? DEFAULT_POSITION
    if (positionKey(start) !== positionKey(rootFen)) {
      throw new Error('Game starts from a different position than the repertoire')
    }
    current = importMoves(current, rep.rootId, game.moves, newId)
  }
  return { repertoire: current, games: games.length }
}

function moveText(parentFen: string, san: string, forceNumber: boolean): string {
  const [, turn, , , , fullMove] = parentFen.split(' ')
  if (turn === 'w') return `${fullMove}. ${san}`
  return forceNumber ? `${fullMove}... ${san}` : san
}

/**
 * Renders `node` (a move), then its comment, its alternatives, and the rest of
 * its line. Alternatives are emitted only while rendering the first child, so
 * each sibling group is written once.
 */
function renderFrom(rep: Repertoire, node: MoveNode, forceNumber: boolean): string[] {
  if (node.parentId === null) throw new Error('Cannot render the root as a move')
  const parent = getNode(rep, node.parentId)

  const tokens = [moveText(parent.fen, node.san ?? '', forceNumber)]
  let needsNumber = false

  if (node.comment) {
    tokens.push(`{${writeComment(node.comment)}}`)
    needsNumber = true
  }

  if (parent.childIds[0] === node.id) {
    for (const altId of parent.childIds.slice(1)) {
      tokens.push(`(${renderFrom(rep, getNode(rep, altId), true).join(' ')})`)
      needsNumber = true
    }
  }

  const [mainChild] = getChildren(rep, node.id)
  if (mainChild) tokens.push(...renderFrom(rep, mainChild, needsNumber))
  return tokens
}

/** Writes the repertoire as one PGN game with variations and comments. */
export function exportPgn(rep: Repertoire): string {
  const root = getNode(rep, rep.rootId)
  const headers = [`[Event "${rep.name.replace(/"/g, "'")}"]`]

  if (positionKey(root.fen) !== positionKey(DEFAULT_POSITION)) {
    headers.push('[SetUp "1"]', `[FEN "${root.fen}"]`)
  }

  const tokens: string[] = []
  if (root.comment) tokens.push(`{${writeComment(root.comment)}}`)
  const [firstMove] = getChildren(rep, rep.rootId)
  if (firstMove) tokens.push(...renderFrom(rep, firstMove, true))
  tokens.push('*')

  return `${headers.join('\n')}\n\n${tokens.join(' ')}\n`
}
