import type { MoveNode, Repertoire } from '../domain/repertoire/tree'

export const EXPORT_FORMAT = 'varianto-repertoires'
export const EXPORT_VERSION = 1

export class ImportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ImportError'
  }
}

export function exportRepertoires(reps: Repertoire[], now: () => Date = () => new Date()): string {
  return JSON.stringify(
    {
      format: EXPORT_FORMAT,
      version: EXPORT_VERSION,
      exportedAt: now().toISOString(),
      repertoires: reps,
    },
    null,
    2,
  )
}

export function parseRepertoires(json: string): Repertoire[] {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    throw new ImportError('File is not valid JSON')
  }

  if (!isRecord(data) || data.format !== EXPORT_FORMAT) {
    throw new ImportError(`Not a ${EXPORT_FORMAT} file`)
  }
  if (data.version !== EXPORT_VERSION) {
    throw new ImportError(`Unsupported export version: ${String(data.version)}`)
  }
  if (!Array.isArray(data.repertoires)) {
    throw new ImportError('"repertoires" must be an array')
  }

  const seen = new Set<string>()
  return data.repertoires.map((raw: unknown, index) => {
    const rep = readRepertoire(raw, index)
    if (seen.has(rep.id)) {
      throw new ImportError(`Duplicate repertoire id "${rep.id}"`)
    }
    seen.add(rep.id)
    validateTree(rep)
    return rep
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readRepertoire(raw: unknown, index: number): Repertoire {
  if (!isRecord(raw)) throw new ImportError(`Repertoire #${index} must be an object`)
  const { id, name, color, rootId, nodes } = raw

  if (typeof id !== 'string' || typeof name !== 'string' || typeof rootId !== 'string') {
    throw new ImportError(`Repertoire #${index} needs string id, name and rootId`)
  }
  if (color !== 'white' && color !== 'black') {
    throw new ImportError(`Repertoire "${id}" has invalid color: ${String(color)}`)
  }
  if (!isRecord(nodes)) {
    throw new ImportError(`Repertoire "${id}" nodes must be an object`)
  }

  const parsed: Record<string, MoveNode> = {}
  for (const [nodeId, node] of Object.entries(nodes)) {
    // Assigning parsed["__proto__"] would set the prototype, not an own key.
    if (nodeId === '__proto__') {
      throw new ImportError(`Repertoire "${id}": node key "__proto__" is not allowed`)
    }
    parsed[nodeId] = readNode(id, nodeId, node)
  }
  return { id, name, color, rootId, nodes: parsed }
}

function readNode(repId: string, nodeId: string, raw: unknown): MoveNode {
  const where = `Repertoire "${repId}", node "${nodeId}"`
  if (!isRecord(raw)) throw new ImportError(`${where}: must be an object`)
  const { id, parentId, san, fen, comment, childIds } = raw

  if (id !== nodeId) throw new ImportError(`${where}: id does not match its key`)
  if (parentId !== null && typeof parentId !== 'string') {
    throw new ImportError(`${where}: parentId must be a string or null`)
  }
  if (san !== null && typeof san !== 'string') {
    throw new ImportError(`${where}: san must be a string or null`)
  }
  if (typeof fen !== 'string' || typeof comment !== 'string') {
    throw new ImportError(`${where}: fen and comment must be strings`)
  }
  if (!Array.isArray(childIds) || !childIds.every((c) => typeof c === 'string')) {
    throw new ImportError(`${where}: childIds must be an array of strings`)
  }
  return { id, parentId, san, fen, comment, childIds: [...(childIds as string[])] }
}

/** Checks links between nodes and that the tree is exactly what the root reaches. */
function validateTree(rep: Repertoire): void {
  const where = (nodeId: string) => `Repertoire "${rep.id}", node "${nodeId}"`

  // Own keys only: plain lookups would also find inherited names like "toString".
  const has = (nodeId: string) => Object.hasOwn(rep.nodes, nodeId)

  if (!has(rep.rootId)) {
    throw new ImportError(`Repertoire "${rep.id}": rootId "${rep.rootId}" is not in nodes`)
  }

  const root = rep.nodes[rep.rootId]
  if (root && root.parentId !== null) {
    throw new ImportError(`${where(root.id)}: root must have parentId null`)
  }

  for (const node of Object.values(rep.nodes)) {
    if (node.parentId !== null && !has(node.parentId)) {
      throw new ImportError(`${where(node.id)}: parent "${node.parentId}" does not exist`)
    }
    for (const childId of node.childIds) {
      if (!has(childId)) {
        throw new ImportError(`${where(node.id)}: child "${childId}" does not exist`)
      }
    }
  }

  const visited = new Set<string>()
  const stack = [rep.rootId]
  while (stack.length > 0) {
    const id = stack.pop()
    if (id === undefined) break
    if (visited.has(id)) {
      throw new ImportError(`${where(id)}: reached twice (cycle or shared child)`)
    }
    visited.add(id)
    for (const childId of rep.nodes[id]?.childIds ?? []) {
      const child = rep.nodes[childId]
      if (child?.parentId !== id) {
        throw new ImportError(
          `${where(childId)}: parentId "${String(child?.parentId)}" does not match "${id}", which lists it as a child`,
        )
      }
      stack.push(childId)
    }
  }

  for (const nodeId of Object.keys(rep.nodes)) {
    if (!visited.has(nodeId)) {
      throw new ImportError(`${where(nodeId)}: not reachable from the root`)
    }
  }
}
