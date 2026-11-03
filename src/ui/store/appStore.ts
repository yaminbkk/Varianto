import { createStore, type StoreApi } from 'zustand/vanilla'
import { repertoireFromOpening } from '../../domain/openings/fromOpening'
import type { OpeningLine } from '../../domain/openings/types'
import { importPgn as importPgnText } from '../../domain/pgn/pgn'
import { renameRepertoire, setRepertoireColor } from '../../domain/repertoire/edit'
import {
  addMove,
  createRepertoire,
  deleteNode,
  setComment as setNodeComment,
  type Color,
  type IdFactory,
  type Repertoire,
} from '../../domain/repertoire/tree'
import type { RepertoireStore, RepertoireSummary } from '../../storage/store'

export interface AppState {
  summaries: RepertoireSummary[]
  current: Repertoire | null
  selectedNodeId: string | null
  /** Last user-facing message; cleared on the next successful action. */
  error: string | null
  /** True after a failed write; cleared on the next successful write. */
  saveError: boolean

  loadList(): Promise<void>
  open(id: string): Promise<void>
  create(name: string, color: Color): Promise<string>
  fromOpening(line: OpeningLine, color: Color): Promise<string>
  importPgn(text: string, name: string, color: Color): Promise<string>
  rename(name: string): Promise<void>
  setColor(color: Color): Promise<void>
  remove(id: string): Promise<void>
  playMove(san: string): Promise<void>
  selectNode(nodeId: string): void
  deleteSelected(): Promise<void>
  setComment(text: string): Promise<void>
}

export interface AppStoreDeps {
  store: RepertoireStore
  newId: IdFactory
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function createAppStore(deps: AppStoreDeps): StoreApi<AppState> {
  const { store, newId } = deps

  return createStore<AppState>()((set, get) => {
    /** Writes through the store; a failure sets `saveError` and keeps memory state. */
    async function save(rep: Repertoire): Promise<boolean> {
      try {
        await store.save(rep)
      } catch {
        set({ saveError: true })
        return false
      }
      set({ saveError: false })
      return true
    }

    /** Saves a freshly built repertoire and adds it to the list. Returns its id, or ''. */
    async function persistNew(rep: Repertoire): Promise<string> {
      if (!(await save(rep))) return ''
      const summary = { id: rep.id, name: rep.name, color: rep.color }
      set((s) => ({ error: null, summaries: [...s.summaries, summary] }))
      return rep.id
    }

    /** Updates `current` in memory, then saves it. */
    async function commit(rep: Repertoire, selectedNodeId: string | null) {
      set({ current: rep, selectedNodeId, error: null })
      await save(rep)
    }

    return {
      summaries: [],
      current: null,
      selectedNodeId: null,
      error: null,
      saveError: false,

      async loadList() {
        set({ summaries: await store.list() })
      },

      async open(id) {
        const rep = await store.load(id)
        if (!rep) {
          set({ error: 'Repertoire not found.' })
          return
        }
        set({ current: rep, selectedNodeId: rep.rootId, error: null })
      },

      async create(name, color) {
        return persistNew(renameRepertoire(createRepertoire(name, color, newId), name))
      },

      async fromOpening(line, color) {
        let rep: Repertoire
        try {
          rep = repertoireFromOpening(line, color, newId)
        } catch (error) {
          set({ error: messageOf(error) })
          return ''
        }
        return persistNew(rep)
      },

      async importPgn(text, name, color) {
        let rep: Repertoire
        try {
          const empty = renameRepertoire(createRepertoire(name, color, newId), name)
          rep = importPgnText(empty, text, newId).repertoire
        } catch (error) {
          set({ error: messageOf(error) })
          return ''
        }
        return persistNew(rep)
      },

      async rename(name) {
        const { current, selectedNodeId } = get()
        if (!current) return
        await commit(renameRepertoire(current, name), selectedNodeId)
      },

      async setColor(color) {
        const { current, selectedNodeId } = get()
        if (!current) return
        await commit(setRepertoireColor(current, color), selectedNodeId)
      },

      async remove(id) {
        try {
          await store.remove(id)
        } catch {
          set({ saveError: true })
          return
        }
        set((s) => ({
          saveError: false,
          error: null,
          summaries: s.summaries.filter((x) => x.id !== id),
          ...(s.current?.id === id ? { current: null, selectedNodeId: null } : {}),
        }))
      },

      async playMove(san) {
        const { current, selectedNodeId } = get()
        if (!current || selectedNodeId === null) return
        let result: ReturnType<typeof addMove>
        try {
          result = addMove(current, selectedNodeId, san, newId)
        } catch (error) {
          set({ error: messageOf(error) })
          return
        }
        await commit(result.repertoire, result.nodeId)
      },

      selectNode(nodeId) {
        set({ selectedNodeId: nodeId })
      },

      async deleteSelected() {
        const { current, selectedNodeId } = get()
        if (!current || selectedNodeId === null) return
        let rep: Repertoire
        try {
          rep = deleteNode(current, selectedNodeId)
        } catch (error) {
          set({ error: messageOf(error) })
          return
        }
        await commit(rep, rep.rootId)
      },

      async setComment(text) {
        const { current, selectedNodeId } = get()
        if (!current || selectedNodeId === null) return
        await commit(setNodeComment(current, selectedNodeId, text), selectedNodeId)
      },
    }
  })
}
