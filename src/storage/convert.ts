import type { Color, MoveNode, Repertoire } from '../domain/repertoire/tree'

export interface RepertoireRow {
  id: string
  name: string
  color: Color
  rootId: string
}

export interface NodeRow extends MoveNode {
  repertoireId: string
}

/** Splits a repertoire into flat rows: one header row plus one row per node. */
export function toRows(rep: Repertoire): { repertoire: RepertoireRow; nodes: NodeRow[] } {
  return {
    repertoire: { id: rep.id, name: rep.name, color: rep.color, rootId: rep.rootId },
    nodes: Object.values(rep.nodes).map((node) => ({
      ...node,
      childIds: [...node.childIds],
      repertoireId: rep.id,
    })),
  }
}

/** Rebuilds a repertoire from its rows. Row order does not matter. */
export function fromRows(repertoire: RepertoireRow, nodes: NodeRow[]): Repertoire {
  const byId: Record<string, MoveNode> = {}
  for (const row of nodes) {
    const { repertoireId: _repertoireId, ...node } = row
    byId[node.id] = { ...node, childIds: [...node.childIds] }
  }
  return {
    id: repertoire.id,
    name: repertoire.name,
    color: repertoire.color,
    rootId: repertoire.rootId,
    nodes: byId,
  }
}
