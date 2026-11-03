import { getChildren, getNode, type Repertoire } from './tree'

export interface OutlineRow {
  nodeId: string
  depth: number
  label: string
}

function moveLabel(fen: string, san: string): string {
  const [, sideToMove, , , , fullmove] = fen.split(' ')
  const number = Number(fullmove)
  // The side to move in a node's own FEN is the opponent of whoever just moved.
  // The FEN counter only advances after Black moves, so Black's move belongs to
  // the previous number.
  return sideToMove === 'b' ? `${number}. ${san}` : `${number - 1}... ${san}`
}

/**
 * Flattens the move tree depth-first, main line (first child) before
 * variations. The root position is excluded. `depth` is 0 on the main line and
 * increases by 1 for each variation branch taken.
 */
export function outlineRows(rep: Repertoire): OutlineRow[] {
  const rows: OutlineRow[] = []
  const stack: { nodeId: string; depth: number }[] = []

  const pushChildren = (parentId: string, depth: number) => {
    const children = getChildren(rep, parentId)
    for (let i = children.length - 1; i >= 0; i--) {
      const child = children[i]
      if (child) stack.push({ nodeId: child.id, depth: i === 0 ? depth : depth + 1 })
    }
  }

  pushChildren(rep.rootId, 0)
  while (stack.length > 0) {
    const item = stack.pop()
    if (item === undefined) break
    const node = getNode(rep, item.nodeId)
    rows.push({
      nodeId: node.id,
      depth: item.depth,
      label: moveLabel(node.fen, node.san ?? ''),
    })
    pushChildren(node.id, item.depth)
  }
  return rows
}
