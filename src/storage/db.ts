import Dexie, { type Table } from 'dexie'
import type { DrillResult } from '../domain/learn/drill'
import type { ReviewCard } from '../domain/learn/review'
import type { NodeRow, RepertoireRow } from './convert'

export interface LearnedRow {
  courseId: string
  lineKey: string
}

export interface ReviewRow {
  courseId: string
  lineKey: string
  card: ReviewCard
}

export interface DrillRow extends DrillResult {
  id?: number
  courseId: string
  at: number
}

export class VariantoDb extends Dexie {
  repertoires!: Table<RepertoireRow, string>
  nodes!: Table<NodeRow, [string, string]>
  learned!: Table<LearnedRow, [string, string]>
  reviews!: Table<ReviewRow, [string, string]>
  drills!: Table<DrillRow, number>

  constructor(name = 'varianto') {
    super(name)
    this.version(1).stores({
      repertoires: 'id',
      nodes: '[repertoireId+id], repertoireId',
    })
    this.version(2).stores({
      learned: '[courseId+lineKey], courseId',
    })
    this.version(3).stores({
      reviews: '[courseId+lineKey], courseId',
      drills: '++id, courseId',
    })
  }
}
