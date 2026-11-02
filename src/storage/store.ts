import type { Color, Repertoire } from '../domain/repertoire/tree'

export interface RepertoireSummary {
  id: string
  name: string
  color: Color
}

/** Persistence boundary for repertoires. Implementations must not leak backend types. */
export interface RepertoireStore {
  /** Inserts or fully replaces the repertoire with the same id. */
  save(rep: Repertoire): Promise<void>
  /** Saves all repertoires atomically. */
  saveMany(reps: Repertoire[]): Promise<void>
  load(id: string): Promise<Repertoire | undefined>
  loadAll(): Promise<Repertoire[]>
  list(): Promise<RepertoireSummary[]>
  /** Deletes the repertoire and its nodes. Unknown ids are ignored. */
  remove(id: string): Promise<void>
}
