import type { SupabaseClient } from '@supabase/supabase-js'
import type { DrillResult } from '../domain/learn/drill'
import type { NodeRow, RepertoireRow } from './convert'
import type { Backend } from './migrate'
import { SupabaseProgressStore, type CardJson, type ProgressGateway } from './supabaseProgress'
import {
  SupabaseRepertoireStore,
  type RepertoireGateway,
  type RepertoireItem,
} from './supabaseStore'

// Column names follow supabase/migrations/0001_init.sql. Row Level Security limits every
// query to the signed-in user, so no query filters by user_id.

function check<T>(result: { data: T | null; error: { message: string } | null }): T | null {
  if (result.error) throw new Error(result.error.message)
  return result.data
}

interface RepertoireDbRow {
  id: string
  name: string
  color: 'white' | 'black'
  root_id: string
}

interface NodeDbRow {
  repertoire_id: string
  id: string
  parent_id: string | null
  san: string | null
  fen: string
  comment: string
  child_ids: string[]
}

const toHeader = (r: RepertoireDbRow): RepertoireRow => ({
  id: r.id,
  name: r.name,
  color: r.color,
  rootId: r.root_id,
})

const toNode = (r: NodeDbRow): NodeRow => ({
  repertoireId: r.repertoire_id,
  id: r.id,
  parentId: r.parent_id,
  san: r.san,
  fen: r.fen,
  comment: r.comment,
  childIds: r.child_ids,
})

function group(headers: RepertoireDbRow[], nodes: NodeDbRow[]): RepertoireItem[] {
  return headers.map((h) => ({
    repertoire: toHeader(h),
    nodes: nodes.filter((n) => n.repertoire_id === h.id).map(toNode),
  }))
}

export function repertoireGateway(client: SupabaseClient): RepertoireGateway {
  return {
    async saveMany(items) {
      const payload = items.map(({ repertoire, nodes }) => ({
        id: repertoire.id,
        name: repertoire.name,
        color: repertoire.color,
        rootId: repertoire.rootId,
        nodes: nodes.map((n) => ({
          id: n.id,
          parentId: n.parentId,
          san: n.san,
          fen: n.fen,
          comment: n.comment,
          childIds: n.childIds,
        })),
      }))
      check(await client.rpc('save_repertoires', { reps: payload }))
    },

    async fetch(id) {
      const headers = check<RepertoireDbRow[]>(
        await client.from('repertoires').select('id,name,color,root_id').eq('id', id),
      )
      if (!headers || headers.length === 0) return undefined
      const nodes = check<NodeDbRow[]>(
        await client
          .from('nodes')
          .select('repertoire_id,id,parent_id,san,fen,comment,child_ids')
          .eq('repertoire_id', id),
      )
      return group(headers, nodes ?? [])[0]
    },

    async fetchAll() {
      const headers = check<RepertoireDbRow[]>(
        await client.from('repertoires').select('id,name,color,root_id').order('name'),
      )
      const nodes = check<NodeDbRow[]>(
        await client.from('nodes').select('repertoire_id,id,parent_id,san,fen,comment,child_ids'),
      )
      return group(headers ?? [], nodes ?? [])
    },

    async fetchHeaders() {
      const headers = check<RepertoireDbRow[]>(
        await client.from('repertoires').select('id,name,color,root_id').order('name'),
      )
      return (headers ?? []).map(toHeader)
    },

    async remove(id) {
      // Nodes are removed by the foreign key's ON DELETE CASCADE.
      check(await client.from('repertoires').delete().eq('id', id))
    },
  }
}

export function progressGateway(client: SupabaseClient): ProgressGateway {
  return {
    async addLearned(courseId, lineKey) {
      check(
        await client
          .from('learned')
          .upsert(
            { course_id: courseId, line_key: lineKey },
            { onConflict: 'user_id,course_id,line_key', ignoreDuplicates: true },
          ),
      )
    },

    async listLearned(courseId) {
      let query = client.from('learned').select('course_id,line_key')
      if (courseId !== undefined) query = query.eq('course_id', courseId)
      const rows = check<{ course_id: string; line_key: string }[]>(await query)
      return (rows ?? []).map((r) => ({ courseId: r.course_id, lineKey: r.line_key }))
    },

    async deleteCourse(courseId) {
      for (const table of ['learned', 'reviews', 'drills']) {
        check(await client.from(table).delete().eq('course_id', courseId))
      }
    },

    async upsertReview(courseId, lineKey, card) {
      check(
        await client
          .from('reviews')
          .upsert(
            { course_id: courseId, line_key: lineKey, card },
            { onConflict: 'user_id,course_id,line_key' },
          ),
      )
    },

    async listReviews(courseId) {
      const rows = check<{ line_key: string; card: CardJson }[]>(
        await client.from('reviews').select('line_key,card').eq('course_id', courseId),
      )
      return (rows ?? []).map((r) => ({ lineKey: r.line_key, card: r.card }))
    },

    async addDrill(courseId, result, at) {
      check(await client.from('drills').insert({ course_id: courseId, at, result }))
    },

    async listDrills(courseId) {
      const rows = check<{ at: number; result: DrillResult }[]>(
        await client.from('drills').select('at,result').eq('course_id', courseId),
      )
      return (rows ?? []).map((r) => ({ ...r.result, at: r.at }))
    },
  }
}

/** The repertoire and progress stores for a signed-in client. */
export function createSupabaseBackend(client: SupabaseClient): Backend {
  return {
    repertoires: new SupabaseRepertoireStore(repertoireGateway(client)),
    progress: new SupabaseProgressStore(progressGateway(client)),
  }
}
