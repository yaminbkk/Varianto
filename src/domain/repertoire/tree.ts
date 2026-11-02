import { Chess, DEFAULT_POSITION } from 'chess.js'

export type Color = 'white' | 'black'

export interface MoveNode {
  id: string
  parentId: string | null
  /** SAN of the move that reached this node; null only for the root. */
  san: string | null
  /** Full FEN of the position after this node's move. */
  fen: string
  comment: string
  /** Children in insertion order (first child is the main line). */
  childIds: string[]
}

export interface Repertoire {
  id: string
  name: string
  color: Color
  rootId: string
  nodes: Record<string, MoveNode>
}

export type IdFactory = () => string

const defaultId: IdFactory = () => crypto.randomUUID()

export function getNode(rep: Repertoire, nodeId: string): MoveNode {
  const node = rep.nodes[nodeId]
  if (!node) throw new Error(`Unknown node: ${nodeId}`)
  return node
}

export function createRepertoire(
  name: string,
  color: Color,
  newId: IdFactory = defaultId,
  startFen: string = DEFAULT_POSITION,
): Repertoire {
  const rootId = newId()
  const root: MoveNode = {
    id: rootId,
    parentId: null,
    san: null,
    fen: startFen,
    comment: '',
    childIds: [],
  }
  return { id: newId(), name, color, rootId, nodes: { [rootId]: root } }
}

/**
 * Adds `san` as a child of `parentId`. Returns the existing child if the same
 * move is already present, so the tree never holds duplicate siblings.
 * The move is validated against the parent position; illegal moves throw.
 */
export function addMove(
  rep: Repertoire,
  parentId: string,
  san: string,
  newId: IdFactory = defaultId,
): { repertoire: Repertoire; nodeId: string } {
  const parent = getNode(rep, parentId)

  const game = new Chess(parent.fen)
  let move: ReturnType<Chess['move']>
  try {
    move = game.move(san)
  } catch {
    throw new Error(`Illegal move ${san} in position ${parent.fen}`)
  }

  const canonical = move.san
  const existing = parent.childIds
    .map((id) => getNode(rep, id))
    .find((child) => child.san === canonical)
  if (existing) return { repertoire: rep, nodeId: existing.id }

  const nodeId = newId()
  const node: MoveNode = {
    id: nodeId,
    parentId,
    san: canonical,
    fen: game.fen(),
    comment: '',
    childIds: [],
  }

  return {
    repertoire: {
      ...rep,
      nodes: {
        ...rep.nodes,
        [nodeId]: node,
        [parentId]: { ...parent, childIds: [...parent.childIds, nodeId] },
      },
    },
    nodeId,
  }
}

/** Removes a node and its entire subtree. The root cannot be deleted. */
export function deleteNode(rep: Repertoire, nodeId: string): Repertoire {
  const target = getNode(rep, nodeId)
  if (target.parentId === null) throw new Error('Cannot delete the root position')

  const toRemove = new Set<string>()
  const stack = [nodeId]
  while (stack.length > 0) {
    const id = stack.pop()
    if (id === undefined) break
    toRemove.add(id)
    stack.push(...getNode(rep, id).childIds)
  }

  const nodes: Record<string, MoveNode> = {}
  for (const [id, node] of Object.entries(rep.nodes)) {
    if (toRemove.has(id)) continue
    nodes[id] =
      id === target.parentId
        ? { ...node, childIds: node.childIds.filter((c) => c !== nodeId) }
        : node
  }
  return { ...rep, nodes }
}

export function setComment(rep: Repertoire, nodeId: string, comment: string): Repertoire {
  const node = getNode(rep, nodeId)
  return { ...rep, nodes: { ...rep.nodes, [nodeId]: { ...node, comment } } }
}

export function getChildren(rep: Repertoire, nodeId: string): MoveNode[] {
  return getNode(rep, nodeId).childIds.map((id) => getNode(rep, id))
}

/** Nodes from the root down to `nodeId`, inclusive. */
export function getLine(rep: Repertoire, nodeId: string): MoveNode[] {
  const line: MoveNode[] = []
  let current: MoveNode | undefined = getNode(rep, nodeId)
  while (current) {
    line.unshift(current)
    current = current.parentId === null ? undefined : getNode(rep, current.parentId)
  }
  return line
}

/** True when the side to move in this node's position is the repertoire's colour. */
export function isUserTurn(rep: Repertoire, nodeId: string): boolean {
  const sideToMove = getNode(rep, nodeId).fen.split(' ')[1]
  return (sideToMove === 'w' ? 'white' : 'black') === rep.color
}

/**
 * Key identifying a position for training and transpositions: the FEN without
 * the halfmove and fullmove counters.
 */
export function positionKey(fen: string): string {
  return fen.split(' ').slice(0, 4).join(' ')
}
