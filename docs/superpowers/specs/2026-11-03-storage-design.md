# Storage: Dexie schema and JSON export/import

Status: **approved 2026-11-03.** Scope is guest mode (local IndexedDB). Login with Supabase sync is a separate, later design.

## Intent
Users keep their repertoires on their own device. Data must survive page reloads, and users must be able to back it up and move it to another browser as a JSON file. This is Phase 1 item 4 in `.md.local/implementation-plan.md`.

## Goals
- Save, load, list, and delete repertoires in IndexedDB through Dexie.
- Export all repertoires to JSON and import that JSON back, with a round trip that yields identical data.
- Validate imported files and reject malformed ones without writing anything.

## Non-goals
- Cards, review logs, settings, and streaks (Phase 3).
- UI, `navigator.storage.persist()` (later phase).
- Sync, accounts, or any network call.

## Anti-goals
- Storage code must not leak into `src/domain/`. Domain stays pure.
- A partial write must never leave a repertoire half-saved.

## Approach (chosen: B)
Two tables, following the draft in `.md.local/architecture.md`:
- `repertoires`: primary key `id`. Fields: `id`, `name`, `color`, `rootId`.
- `nodes`: compound primary key `[repertoireId+id]`, indexed by `repertoireId`. (Changed from `id` alone during planning: node ids are not unique across repertoires, so an `id`-only key would let one repertoire overwrite another's nodes.) Fields: `id`, `repertoireId`, `parentId`, `san`, `fen`, `comment`, `childIds`.

Rationale for B over A: editing one move writes one row, and the tree can grow without rewriting whole repertoires. The cost is that we must rebuild the in-memory tree from rows, which the conversion functions below handle.

The domain type `Repertoire` in `src/domain/repertoire/tree.ts` stays unchanged. Storage converts between that type and rows.

## Design

### Store interface
App code uses only this interface, so a Supabase implementation can be added later without changing callers:
```ts
interface RepertoireStore {
  save(rep: Repertoire): Promise<void>
  load(id: string): Promise<Repertoire | undefined>
  list(): Promise<RepertoireSummary[]> // { id, name, color }
  remove(id: string): Promise<void>
  saveMany(reps: Repertoire[]): Promise<void> // one transaction, used by import
  loadAll(): Promise<Repertoire[]> // used by export
}
```
This round implements `DexieRepertoireStore` only.

### Module layout
- `src/storage/store.ts`: the `RepertoireStore` interface and `RepertoireSummary` type.
- `src/storage/db.ts`: Dexie class `VariantoDb` with `version(1)` declaring the two tables.
- `src/storage/convert.ts`: pure functions `toRows(rep)` → `{ repertoire, nodes }` and `fromRows(repertoire, nodes)` → `Repertoire`. No Dexie import, so they are unit-testable without a browser.
- `src/storage/dexieStore.ts`: `DexieRepertoireStore` implementing `RepertoireStore`. Every write runs in one `rw` transaction over both tables.
- `src/storage/exchange.ts`: `exportRepertoires(reps)` → JSON string, and `importRepertoires(json)` → validated `Repertoire[]`.

### Saving
`save` deletes all `nodes` with the repertoire's `repertoireId`, then bulk-puts the new rows and the repertoire row. Deleting first removes nodes that were pruned from the tree.

### JSON format
```json
{
  "format": "varianto-repertoires",
  "version": 1,
  "exportedAt": "2026-11-03T00:00:00.000Z",
  "repertoires": [ { "id": "...", "name": "...", "color": "white", "rootId": "...", "nodes": { } } ]
}
```
The export uses the domain shape (nested `nodes` map), not the DB rows. The file therefore does not depend on the Dexie schema, so the DB can change later without breaking old backups.

### Import validation
Reject, with a thrown error and no writes, when:
- `format` is not `varianto-repertoires`, or `version` is not `1`.
- `rootId` is not in `nodes`.
- Any `childIds` entry or non-null `parentId` points to a missing node.
- A node's `parentId` does not list it in `childIds`.
- `color` is not `white` or `black`.

Once validation passes, all repertoires are written in one transaction.

## Decisions
1. **Import with an existing `id`** replaces the stored repertoire, so re-imports are idempotent.
2. **Dexie version 1** is the starting schema. Future changes add `version(2)` with a migration.
3. **Tests use `fake-indexeddb`** (Apache-2.0, compatible with GPL-3.0) as a dev dependency so Vitest can run Dexie in Node.

## Testing
- `convert.test.ts`: `fromRows(...toRows(rep))` equals `rep` for default, branched, and FEN-started repertoires.
- `exchange.test.ts`: export then import equals the input. Malformed inputs (each rule above) throw and leave the store untouched.
- `dexieStore.test.ts` (with `fake-indexeddb`): save, load, list, remove, saveMany, loadAll. Saving a pruned tree removes the orphaned node rows.
