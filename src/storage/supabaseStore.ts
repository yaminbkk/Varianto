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

  constructor(gateway: RepertoireGateway) {
    this.gateway = gateway
  }

  save(rep: Repertoire): Promise<void> {
    return this.saveMany([rep])
  }

  saveMany(reps: Repertoire[]): Promise<void> {
    return this.gateway.saveMany(reps.map(toRows))
  }

  async load(id: string): Promise<Repertoire | undefined> {
    const item = await this.gateway.fetch(id)
    return item ? fromRows(item.repertoire, item.nodes) : undefined
  }

  async loadAll(): Promise<Repertoire[]> {
    const items = await this.gateway.fetchAll()
    return items.map((item) => fromRows(item.repertoire, item.nodes))
  }

  async list(): Promise<RepertoireSummary[]> {
    const headers = await this.gateway.fetchHeaders()
    return headers.map(({ id, name, color }) => ({ id, name, color }))
  }

  remove(id: string): Promise<void> {
    return this.gateway.remove(id)
  }
}
