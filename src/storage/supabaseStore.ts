import type { Repertoire } from '../domain/repertoire/tree'
import { fromRows, toRows, type NodeRow, type RepertoireRow } from './convert'
import type { RepertoireStore, RepertoireSummary } from './store'

export interface RepertoireItem {
  repertoire: RepertoireRow
  nodes: NodeRow[]
}

/** The remote calls the store needs. Saving replaces each repertoire's nodes atomically. */
export interface RepertoireGateway {
  saveMany(items: RepertoireItem[]): Promise<void>
  fetch(id: string): Promise<RepertoireItem | undefined>
  fetchAll(): Promise<RepertoireItem[]>
  /** Headers only, without nodes. */
  fetchHeaders(): Promise<RepertoireRow[]>
  remove(id: string): Promise<void>
}

/** Repertoire storage in the user's Supabase account. */
export class SupabaseRepertoireStore implements RepertoireStore {
  private readonly gateway: RepertoireGateway
  // Saves replace whole trees, so two in flight at once could finish out of order and leave the
  // older tree behind. Each save waits for the one before it.
  private queue: Promise<unknown> = Promise.resolve()

  constructor(gateway: RepertoireGateway) {
    this.gateway = gateway
  }

  save(rep: Repertoire): Promise<void> {
    return this.saveMany([rep])
  }

  saveMany(reps: Repertoire[]): Promise<void> {
    const items = reps.map(toRows)
    const run = this.queue.then(() => this.gateway.saveMany(items))
    this.queue = run.catch(() => {})
    return run
  }

  async load(id: string): Promise<Repertoire | undefined> {
    const item = await this.gateway.fetch(id)
    return item ? rebuild(item) : undefined
  }

  async loadAll(): Promise<Repertoire[]> {
    const items = await this.gateway.fetchAll()
    return items.map(rebuild)
  }

  async list(): Promise<RepertoireSummary[]> {
    const headers = await this.gateway.fetchHeaders()
    return headers.map(({ id, name, color }) => ({ id, name, color }))
  }

  remove(id: string): Promise<void> {
    return this.gateway.remove(id)
  }
}

/**
 * Rebuilds the tree, refusing one with missing nodes. A truncated tree handed to the editor
 * would be saved back and the missing nodes lost for good.
 */
function rebuild(item: RepertoireItem): Repertoire {
  const rep = fromRows(item.repertoire, item.nodes)
  const missing =
    !(rep.rootId in rep.nodes) ||
    Object.values(rep.nodes).some(
      (node) =>
        node.childIds.some((id) => !(id in rep.nodes)) ||
        (node.parentId !== null && !(node.parentId in rep.nodes)),
    )
  if (missing) throw new Error(`Repertoire "${rep.name}" is incomplete on the server`)
  return rep
}
