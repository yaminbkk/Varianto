import Dexie, { type Table } from 'dexie'
import type { NodeRow, RepertoireRow } from './convert'

export class VariantoDb extends Dexie {
  repertoires!: Table<RepertoireRow, string>
  nodes!: Table<NodeRow, [string, string]>

  constructor(name = 'varianto') {
    super(name)
    this.version(1).stores({
      repertoires: 'id',
      nodes: '[repertoireId+id], repertoireId',
    })
  }
}
