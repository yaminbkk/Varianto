import Dexie, { type Table } from 'dexie'
import type { NodeRow, RepertoireRow } from './convert'

export interface LearnedRow {
  courseId: string
  lineKey: string
}

export class VariantoDb extends Dexie {
  repertoires!: Table<RepertoireRow, string>
  nodes!: Table<NodeRow, [string, string]>
  learned!: Table<LearnedRow, [string, string]>

  constructor(name = 'varianto') {
    super(name)
    this.version(1).stores({
      repertoires: 'id',
      nodes: '[repertoireId+id], repertoireId',
    })
    this.version(2).stores({
      learned: '[courseId+lineKey], courseId',
    })
  }
}
