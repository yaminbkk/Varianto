import type { Repertoire } from '../domain/repertoire/tree'
import { fromRows, toRows } from './convert'
import type { VariantoDb } from './db'
import type { RepertoireStore, RepertoireSummary } from './store'

export class DexieRepertoireStore implements RepertoireStore {
  private readonly db: VariantoDb

  constructor(db: VariantoDb) {
    this.db = db
  }

  save(rep: Repertoire): Promise<void> {
    return this.saveMany([rep])
  }

  saveMany(reps: Repertoire[]): Promise<void> {
    const { db } = this
    return db.transaction('rw', db.repertoires, db.nodes, async () => {
      for (const rep of reps) {
        const { repertoire, nodes } = toRows(rep)
        // Replace, not merge: nodes pruned from the tree must not linger.
        await db.nodes.where('repertoireId').equals(rep.id).delete()
        await db.repertoires.put(repertoire)
        await db.nodes.bulkPut(nodes)
      }
    })
  }

  async load(id: string): Promise<Repertoire | undefined> {
    const { db } = this
    return db.transaction('r', db.repertoires, db.nodes, async () => {
      const repertoire = await db.repertoires.get(id)
      if (!repertoire) return undefined
      const nodes = await db.nodes.where('repertoireId').equals(id).toArray()
      return fromRows(repertoire, nodes)
    })
  }

  async loadAll(): Promise<Repertoire[]> {
    const { db } = this
    return db.transaction('r', db.repertoires, db.nodes, async () => {
      const [repertoires, nodes] = await Promise.all([db.repertoires.toArray(), db.nodes.toArray()])
      return repertoires.map((repertoire) =>
        fromRows(
          repertoire,
          nodes.filter((node) => node.repertoireId === repertoire.id),
        ),
      )
    })
  }

  async list(): Promise<RepertoireSummary[]> {
    const rows = await this.db.repertoires.toArray()
    return rows.map(({ id, name, color }) => ({ id, name, color }))
  }

  remove(id: string): Promise<void> {
    const { db } = this
    return db.transaction('rw', db.repertoires, db.nodes, async () => {
      await db.nodes.where('repertoireId').equals(id).delete()
      await db.repertoires.delete(id)
    })
  }
}
