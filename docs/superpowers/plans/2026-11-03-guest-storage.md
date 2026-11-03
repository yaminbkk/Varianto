# Guest Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist repertoires in IndexedDB behind a `RepertoireStore` interface, with a validated JSON export/import round trip.

**Architecture:** Pure row conversion (`convert.ts`) and pure JSON exchange (`exchange.ts`) sit under `src/storage/` with no Dexie import. `DexieRepertoireStore` implements the `RepertoireStore` interface over two tables, `repertoires` and `nodes`. A future Supabase store implements the same interface.

**Tech Stack:** TypeScript strict, Dexie 4.4.7, Vitest 5 (node environment), `fake-indexeddb` 6.2.7 (dev only).

**Spec:** `docs/superpowers/specs/2026-11-03-storage-design.md`

## Global Constraints

- `src/domain/` stays unchanged and must not import from `src/storage/`'s Dexie code.
- Functions never mutate their inputs.
- JSON format string is exactly `varianto-repertoires`, version exactly `1`.
- Every write to Dexie runs in one `rw` transaction over both tables.
- Commit per TDD step: a failing-test commit (`Add failing test for ...`), then an implementation commit. Every non-failing-test commit passes `npx vitest run` and `npm run build`.
- Commit trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Do not push.

## Deviation from the spec (plan-level decision)

The `nodes` table uses the compound primary key `[repertoireId+id]`, not `id` alone. Node ids are not guaranteed unique across repertoires (an imported copy of a file, or a deterministic id factory, can repeat them), and with `id` alone, saving one repertoire would overwrite another's nodes. Schema string: `nodes: '[repertoireId+id], repertoireId'`, `repertoires: 'id'`.

## Review Focus

1. Two repertoires whose node ids collide: saving one must not change the other. (Task 3 test.)
2. A file containing text that is not JSON: import throws a clear error, not a raw `SyntaxError` crash path with partial writes. (Task 2 test.)
3. A tree with a cycle or an unreachable node: import rejects it. (Task 2 test, rule "every node reachable from root exactly once".)
4. The same repertoire `id` listed twice in one file: import rejects it. (Task 2 test.)
5. `load` of an unknown id returns `undefined` and `remove` of an unknown id does not throw. (Task 3 test.)

---

### Task 1: Row conversion

**Files:**

- Create: `src/storage/convert.ts`
- Test: `src/storage/convert.test.ts`

**Interfaces:**

- Consumes: `Repertoire`, `MoveNode`, `Color`, `createRepertoire`, `addMove` from `src/domain/repertoire/tree.ts`.
- Produces:

  ```ts
  export interface RepertoireRow {
    id: string
    name: string
    color: Color
    rootId: string
  }
  export interface NodeRow extends MoveNode {
    repertoireId: string
  }
  export function toRows(rep: Repertoire): { repertoire: RepertoireRow; nodes: NodeRow[] }
  export function fromRows(repertoire: RepertoireRow, nodes: NodeRow[]): Repertoire
  ```

- [ ] **Step 1: Write the failing tests** in `convert.test.ts`, using a `sequentialIds()` helper like `tree.test.ts`:
  - `round-trips a fresh repertoire`: `fromRows(...)` of `toRows(createRepertoire('Italian','white',ids))` `toEqual` the input.
  - `round-trips a branched repertoire`: tree with `e4 e5 Nf3` and sibling `e4 c5`; round trip `toEqual` input.
  - `round-trips a FEN-started repertoire`: `createRepertoire('End','black',ids, '<some FEN>')`.
  - `tags every node row with the repertoire id`: every `nodes[i].repertoireId === rep.id`, and `nodes.length === Object.keys(rep.nodes).length`.
  - `does not mutate the input`: `structuredClone` before, `toEqual` after.
  - `fromRows ignores row order`: reversing `nodes` gives the same result.
- [ ] **Step 2: Run** `npx vitest run src/storage/convert.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 3: Commit** `Add failing tests for storage row conversion`.
- [ ] **Step 4: Implement** `toRows` and `fromRows`. `fromRows` drops `repertoireId` from each node so the result matches the domain shape exactly.
- [ ] **Step 5: Run** `npx vitest run src/storage/convert.test.ts`. Expected: PASS.
- [ ] **Step 6: Commit** `Add row conversion between repertoires and storage rows`.

### Task 2: JSON export and validated import

**Files:**

- Create: `src/storage/exchange.ts`
- Test: `src/storage/exchange.test.ts`

**Interfaces:**

- Consumes: `Repertoire` from the domain.
- Produces:

  ```ts
  export const EXPORT_FORMAT = 'varianto-repertoires'
  export const EXPORT_VERSION = 1
  export class ImportError extends Error {}
  export function exportRepertoires(reps: Repertoire[], now: () => Date = () => new Date()): string
  export function parseRepertoires(json: string): Repertoire[] // throws ImportError
  ```

- [ ] **Step 1: Write the failing tests**:
  - `round-trips repertoires`: `parseRepertoires(exportRepertoires([a, b]))` `toEqual([a, b])`.
  - `writes format, version and exportedAt`: with `now = () => new Date('2026-11-03T00:00:00.000Z')`, parsed JSON has `format: 'varianto-repertoires'`, `version: 1`, `exportedAt: '2026-11-03T00:00:00.000Z'`.
  - `accepts an empty list`: round trip of `[]` gives `[]`.
  - Each of these throws `ImportError` (one `it` each): not JSON (`'not json'`); wrong `format`; `version: 2`; `repertoires` not an array; `color: 'red'`; `rootId` missing from `nodes`; a `childIds` entry pointing to a missing node; `parentId` pointing to a missing node; a child whose `parentId` does not match the node listing it; a node unreachable from the root; a cycle (a node listing an ancestor as child); the same repertoire `id` twice in one file.
- [ ] **Step 2: Run** `npx vitest run src/storage/exchange.test.ts`. Expected: FAIL.
- [ ] **Step 3: Commit** `Add failing tests for JSON export and import`.
- [ ] **Step 4: Implement**. Wrap `JSON.parse` so its error becomes `ImportError`. Validate reachability with a walk from `rootId` that fails on a node visited twice and, at the end, on any node not visited. Error messages name the repertoire and node id.
- [ ] **Step 5: Run** the test file. Expected: PASS.
- [ ] **Step 6: Commit** `Add JSON export and validated import for repertoires`.

### Task 3: RepertoireStore interface and Dexie implementation

**Files:**

- Create: `src/storage/store.ts`, `src/storage/db.ts`, `src/storage/dexieStore.ts`
- Test: `src/storage/dexieStore.test.ts`
- Modify: `package.json` (dev dependency `fake-indexeddb@6.2.7`)

**Interfaces:**

- Consumes: Task 1 `toRows`, `fromRows`, `RepertoireRow`, `NodeRow`.
- Produces:

  ```ts
  // store.ts
  export interface RepertoireSummary {
    id: string
    name: string
    color: Color
  }
  export interface RepertoireStore {
    save(rep: Repertoire): Promise<void>
    saveMany(reps: Repertoire[]): Promise<void>
    load(id: string): Promise<Repertoire | undefined>
    loadAll(): Promise<Repertoire[]>
    list(): Promise<RepertoireSummary[]>
    remove(id: string): Promise<void>
  }
  // db.ts
  export class VariantoDb extends Dexie {
    repertoires!: Table<RepertoireRow, string>
    nodes!: Table<NodeRow, [string, string]>
    constructor(name = 'varianto')
  }
  // dexieStore.ts
  export class DexieRepertoireStore implements RepertoireStore {
    constructor(db: VariantoDb)
  }
  ```

- [ ] **Step 1: Install** `npm install -D fake-indexeddb@6.2.7`.
- [ ] **Step 2: Write the failing tests**. Start the file with `import 'fake-indexeddb/auto'`. Each test builds a `new VariantoDb(\`test-${crypto.randomUUID()}\`)`so tests are isolated, and closes it in`afterEach`.
  - `saves and loads a repertoire`: `load(rep.id)` `toEqual(rep)`.
  - `returns undefined for an unknown id`.
  - `lists summaries`: two saved reps give `[{id,name,color}, ...]` (compare sorted by id).
  - `saving a pruned tree removes orphaned nodes`: save, `deleteNode` a branch, save again; `db.nodes.where('repertoireId').equals(rep.id).count()` equals the pruned node count.
  - `keeps repertoires with colliding node ids separate`: two reps built with the same `sequentialIds()` sequence but different repertoire ids and different moves; saving the second leaves `load(first.id)` equal to the first.
  - `removes a repertoire and its nodes`; and `remove of an unknown id does not throw`.
  - `saveMany then loadAll round-trips`, and `saveMany replaces a repertoire with the same id`.
- [ ] **Step 3: Run** `npx vitest run src/storage/dexieStore.test.ts`. Expected: FAIL.
- [ ] **Step 4: Commit** `Add failing tests for Dexie repertoire store` (include `package.json` and lockfile).
- [ ] **Step 5: Implement** `store.ts`, `db.ts` (`this.version(1).stores({ repertoires: 'id', nodes: '[repertoireId+id], repertoireId' })`), and `dexieStore.ts`. `save` and `saveMany` each run one `db.transaction('rw', db.repertoires, db.nodes, ...)` that deletes the repertoire's nodes by `repertoireId` and then `bulkPut`s. `remove` deletes both in one transaction.
- [ ] **Step 6: Run** the test file. Expected: PASS.
- [ ] **Step 7: Commit** `Add RepertoireStore interface and Dexie implementation`.

### Task 4: Final verification and status

- [ ] **Step 1: Run** `npx vitest run`, `npm run build`, `npm run lint`. Expected: all pass, no lint errors.
- [ ] **Step 2: Update** `CLAUDE.md` "Current status" to mark guest storage done with its commit, and record the compound key in the spec's Approach section.
- [ ] **Step 3: Commit** `Mark guest storage done in project status`.
