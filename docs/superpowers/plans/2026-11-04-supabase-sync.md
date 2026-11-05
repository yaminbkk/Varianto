# Supabase Sync and Pages Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Optional email/password login that switches storage from Dexie to Supabase, plus a GitHub Pages deploy workflow.

**Architecture:** Supabase stores implement the existing `RepertoireStore` and `ProgressStore` over small gateway interfaces (unit tested with in-memory gateways); a thin real gateway wraps `@supabase/supabase-js`, loaded lazily. Switchable wrappers swap Dexie and Supabase on login/logout.

**Tech Stack:** Vite, React, Zustand, Dexie, `@supabase/supabase-js` (MIT), Vitest, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-11-04-supabase-sync-design.md`

## Global Constraints

- Domain code in `src/domain/` must not import React or the DOM; stores return new objects, never mutate inputs.
- Guest mode: no network call and no `@supabase/supabase-js` import in the initial bundle; login UI hidden when `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are absent.
- Supabase is the only backend. No analytics. English only in repo files.
- Every commit leaves `npx vitest run` and `npm run build` passing; a red commit is allowed only as "Add failing test for ...".
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Do not push.

## Review Focus

- Logged-in user A must never read or write user B's rows (RLS policies in the migration).
- Saving a repertoire whose nodes were pruned must not leave stale remote nodes (replace, not merge).
- Switching backends while a call is in flight must not write to the wrong backend.
- Logout must not delete guest data; migration must not run automatically.
- Missing env keys must leave the app fully functional as a guest.

---

### Task 1: Pages deploy config

**Files:**

- Modify: `vite.config.ts`
- Create: `.github/workflows/pages.yml`

**Interfaces:** Produces: `base` taken from `process.env.VITE_BASE ?? '/'`.

- [ ] **Step 1:** In `vite.config.ts` add `base: process.env.VITE_BASE ?? '/'`.
- [ ] **Step 2:** Create `pages.yml`: on push to `main` and `workflow_dispatch`; permissions `contents: read, pages: write, id-token: write`; job `build` checks out, sets up Node from `.node-version`, `npm ci`, runs `npx vitest run`, `npm run build` and `npm run lint` with `VITE_BASE=/Varianto/` and `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` from `vars.*` on the build step, then `actions/upload-pages-artifact` (`dist`); job `deploy` uses `actions/deploy-pages` with environment `github-pages`.
- [ ] **Step 3:** Run `VITE_BASE=/Varianto/ npm run build`. Expected: built, and `dist/index.html` references `/Varianto/assets/`.
- [ ] **Step 4:** Commit `Add GitHub Pages deploy workflow`.

### Task 2: Database migration

**Files:** Create `supabase/migrations/0001_init.sql`.

**Interfaces:** Produces tables `repertoires(user_id, id, name, color, root_id)`, `nodes(user_id, repertoire_id, id, parent_id, san, fen, comment, child_ids)`, `learned(user_id, course_id, line_key)`, `reviews(user_id, course_id, line_key, card jsonb)`, `drills(user_id, id, course_id, at, result jsonb)`; function `save_repertoires(reps jsonb) returns void` where `reps` is an array of `{id,name,color,rootId,nodes:[{id,parentId,san,fen,comment,childIds}]}`.

- [ ] **Step 1:** Write the SQL: each table has `user_id uuid not null default auth.uid() references auth.users(id) on delete cascade`, primary key starting with `user_id`, RLS enabled, one `for all` policy `using (user_id = auth.uid()) with check (user_id = auth.uid())`. `nodes` has a foreign key `(user_id, repertoire_id)` to `repertoires` with `on delete cascade`. `save_repertoires` is `security invoker`: for each element delete the repertoire's nodes, upsert the repertoire, insert its nodes, all in the function's one transaction.
- [ ] **Step 2:** If a local Postgres is available, apply the file against a scratch database with a stub `auth` schema to prove it parses; otherwise read it back line by line. Record which in the ledger.
- [ ] **Step 3:** Commit `Add Supabase schema with row level security`.

### Task 3: SupabaseRepertoireStore

**Files:** Create `src/storage/supabaseStore.ts`, `src/storage/supabaseStore.test.ts`.

**Interfaces:**

- Consumes: `RepertoireStore`, `toRows`, `fromRows`, `RepertoireRow`, `NodeRow` from existing storage.
- Produces:

```ts
export interface RepertoireGateway {
  saveMany(items: { repertoire: RepertoireRow; nodes: NodeRow[] }[]): Promise<void> // atomic, replaces nodes
  fetch(id: string): Promise<{ repertoire: RepertoireRow; nodes: NodeRow[] } | undefined>
  fetchAll(): Promise<{ repertoire: RepertoireRow; nodes: NodeRow[] }[]>
  remove(id: string): Promise<void>
}
export class SupabaseRepertoireStore implements RepertoireStore {
  constructor(gateway: RepertoireGateway)
}
```

- [ ] **Step 1:** Write the failing test with an in-memory `RepertoireGateway` fake whose `saveMany` replaces nodes per repertoire. Tests: save then load round-trips equal; saving a pruned tree drops removed nodes (Review Focus 2); `list` returns `{id,name,color}`; `loadAll`; `remove` then `load` is `undefined`; unknown remove ignored; input repertoire is not mutated.
- [ ] **Step 2:** Run `npx vitest run src/storage/supabaseStore.test.ts`. Expected: FAIL (module not found). Commit `Add failing test for the Supabase repertoire store`.
- [ ] **Step 3:** Implement the store as pure mapping over the gateway.
- [ ] **Step 4:** Run the same command. Expected: PASS. Commit `Add the Supabase repertoire store`.

### Task 4: SupabaseProgressStore

**Files:** Create `src/storage/supabaseProgress.ts`, `src/storage/supabaseProgress.test.ts`.

**Interfaces:**

- Consumes: `ProgressStore`, `DrillRecord`, `ReviewCard`, `DrillResult`.
- Produces:

```ts
export interface ProgressGateway {
  addLearned(courseId: string, lineKey: string): Promise<void> // idempotent
  listLearned(courseId?: string): Promise<{ courseId: string; lineKey: string }[]>
  deleteCourse(courseId: string): Promise<void> // learned, reviews, drills
  upsertReview(courseId: string, lineKey: string, card: ReviewCard): Promise<void>
  listReviews(courseId: string): Promise<{ lineKey: string; card: ReviewCard }[]>
  addDrill(courseId: string, result: DrillResult, at: number): Promise<void>
  listDrills(courseId: string): Promise<(DrillResult & { at: number })[]>
}
export class SupabaseProgressStore implements ProgressStore {
  constructor(gateway: ProgressGateway)
}
```

- [ ] **Step 1:** Failing test with an in-memory gateway, mirroring `src/storage/dexieProgress.test.ts` cases: markLearned idempotent; `learnedLines` set; `learnedCounts` per course; `reset` clears one course only; review card replace; drills newest first.
- [ ] **Step 2:** Run it. Expected: FAIL. Commit `Add failing test for the Supabase progress store`.
- [ ] **Step 3:** Implement; counting and newest-first sorting live in the store, not the gateway.
- [ ] **Step 4:** Run. Expected: PASS. Commit `Add the Supabase progress store`.

### Task 5: Switchable stores

**Files:** Create `src/storage/switchable.ts`, `src/storage/switchable.test.ts`.

**Interfaces:**

- Produces:

```ts
export class SwitchableRepertoireStore implements RepertoireStore {
  constructor(initial: RepertoireStore)
  use(next: RepertoireStore): void
}
export class SwitchableProgressStore implements ProgressStore {
  constructor(initial: ProgressStore)
  use(next: ProgressStore): void
}
```

- [ ] **Step 1:** Failing tests: calls go to the current backend; after `use`, new calls go to the new backend and never the old; a call started before `use` completes on the backend it started on (Review Focus 3).
- [ ] **Step 2:** Run. Expected: FAIL. Commit `Add failing test for switchable stores`.
- [ ] **Step 3:** Implement by capturing `this.current` synchronously at call time.
- [ ] **Step 4:** Run. Expected: PASS. Commit `Add switchable stores`.

### Task 6: Copy guest data into the account

**Files:** Create `src/storage/migrate.ts`, `src/storage/migrate.test.ts`.

**Interfaces:**

- Consumes: both store interfaces, plus a `listCourseIds` function supplied by the caller.
- Produces: `copyLocalToAccount(from: { repertoires: RepertoireStore; progress: ProgressStore }, to: { repertoires: RepertoireStore; progress: ProgressStore }, courseIds: string[]): Promise<{ repertoires: number; lines: number }>`.

- [ ] **Step 1:** Failing test with two Dexie-backed (fake-indexeddb) stores or in-memory ones: repertoires, learned lines, review cards and drills in `from` appear in `to`; `from` is unchanged afterwards (Review Focus 4); running twice does not duplicate learned lines; returned counts are correct.
- [ ] **Step 2:** Run. Expected: FAIL. Commit `Add failing test for copying guest data`.
- [ ] **Step 3:** Implement via `loadAll`/`saveMany`, `learnedLines`/`markLearned`, `reviewCards`/`saveReview`, `drillResults`/`addDrillResult`.
- [ ] **Step 4:** Run. Expected: PASS. Commit `Copy guest data into an account`.

### Task 7: Auth module and real gateways

**Files:** Create `src/auth/auth.ts`, `src/auth/auth.test.ts`, `src/storage/supabaseClient.ts`, `src/storage/supabaseGateways.ts`; modify `package.json`, `.env.example`, `src/vite-env.d.ts` (if present).

**Interfaces:**

- Produces:

```ts
export interface AuthService {
  readonly enabled: boolean
  currentUser(): Promise<{ id: string; email: string } | undefined>
  signIn(email: string, password: string): Promise<void>
  signUp(email: string, password: string): Promise<void>
  signOut(): Promise<void>
  onChange(listener: (user: { id: string; email: string } | undefined) => void): () => void
}
export function createAuthService(
  env: { url?: string; anonKey?: string },
  load: () => Promise<typeof import('@supabase/supabase-js')>,
): AuthService
export function createSupabaseBackends(client: unknown): {
  repertoires: RepertoireStore
  progress: ProgressStore
}
```

- [ ] **Step 1:** Failing test for `createAuthService`: with empty env, `enabled` is `false`, `currentUser()` resolves `undefined`, and `load` is never called (Review Focus 5); with env set and a fake `load`, `signIn` forwards credentials and rejects with the server's message on error; `onChange` is unsubscribed by the returned function.
- [ ] **Step 2:** Run. Expected: FAIL. Commit `Add failing test for the auth service`.
- [ ] **Step 3:** `npm install @supabase/supabase-js` (verify license MIT). Implement `createAuthService`; `supabaseGateways.ts` implements both gateways with the client (`rpc('save_repertoires')`, `from(...).select/upsert/delete`), mapping to the Task 2 columns; `createSupabaseBackends` wires them into the two stores.
- [ ] **Step 4:** Run the test, `npm run build`, `npm run lint`. Expected: all pass, and the initial JS chunk does not contain `@supabase` (check with `grep -l supabase dist/assets/*.js`: only the lazy chunk).
- [ ] **Step 5:** Commit `Add the auth service and Supabase gateways`.

### Task 8: Account UI and wiring

**Files:** Create `src/ui/pages/AccountPage.tsx`, `src/ui/AuthContext.tsx`; modify `src/main.tsx`, `src/App.tsx`, `src/ui/router.tsx`, `src/ui/paths.ts`, `src/ui/paths.test.ts`, `src/ui/AppHeader.tsx`.

**Interfaces:**

- Consumes: `AuthService`, switchable stores, `copyLocalToAccount`, `createSupabaseBackends`.
- Produces: `accountPath = '/account'`; `AuthProvider` and `useAuth()`.

- [ ] **Step 1:** Add a failing `paths.test.ts` case for `accountPath`. Run; expected FAIL; commit `Add failing test for the account path`. Implement; commit `Add the account path`.
- [ ] **Step 2:** `main.tsx` builds Dexie stores wrapped in the switchable stores and an `AuthService` from `import.meta.env`. On a signed-in user it calls `createSupabaseBackends` and `use()`s them, then reloads app data; on sign-out it `use()`s Dexie again. `AccountPage` shows sign in/up form, signed-in email with Sign out, and a "Copy my guest data to this account" button (explicit click only). `AppHeader` shows an Account link only when `auth.enabled`.
- [ ] **Step 3:** Run `npx vitest run`, `npm run build`, `npm run lint`, `npm run format:check`. Expected: all pass.
- [ ] **Step 4:** In the browser (dev server, no env keys): the app works as a guest and the header has no Account link; the Network panel shows no Supabase requests. Record the result.
- [ ] **Step 5:** Commit `Add login and account page`.

### Task 9: Docs and status

**Files:** Modify `README.md`, `CLAUDE.md` (Current status), `.env.example`; create `docs/deploy.md`.

- [ ] **Step 1:** `docs/deploy.md`: create the Supabase project, run `supabase/migrations/0001_init.sql` in the SQL editor, set repository variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, enable Pages with source GitHub Actions, push `main`. README: replace the "no account" wording with "optional account".
- [ ] **Step 2:** Run `npx prettier --check .`; fix. Commit `Document deployment and the optional account`.
