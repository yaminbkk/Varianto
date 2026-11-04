# Optional login with Supabase sync, and GitHub Pages deploy

Status: written 2026-11-04 under the owner's instruction to carry the plan through to deployment without further questions. Choices below are the builder's calls, marked **Call**.

## Intent

Guest mode stays the default and works with no account and no network. A user may optionally log in; then repertoires and learn progress live in Supabase, so they follow the user across devices. The site itself is static and deploys to GitHub Pages.

## Goals

- Log in, sign up and sign out with email and password.
- While logged in, the app reads and writes through Supabase; while a guest, through Dexie. Callers only see `RepertoireStore` and `ProgressStore`.
- Row Level Security: a user can only touch rows whose `user_id` is their own.
- On first login, the user can copy their local guest data into the account.
- A GitHub Actions workflow builds and publishes the static site to GitHub Pages.

## Non-goals

- Offline edits while logged in, conflict resolution, realtime sync. Remote is the source of truth when logged in.
- OAuth providers, magic links, password reset UI (Supabase's hosted flow is enough for now).
- Any backend other than Supabase.

## Anti-goals

- No network call and no Supabase code loaded in guest mode, and none at all when the build has no Supabase keys.
- No analytics or trackers.
- Guest data is never deleted by login or logout.

## Approaches considered

1. **Remote replaces local while logged in (chosen).** A switchable store delegates to Dexie or Supabase. Simple, matches the `RepertoireStore` seam the storage design left for this. Cost: no offline use while logged in.
2. Local-first with background sync. Best UX offline, but needs change tracking and conflict handling; far larger than this scope.
3. Supabase only (drop guest). Violates the guest-mode rule.

## Design

- **Config (Call):** `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` at build time. The anon key is public by design; RLS protects data. Without them the login UI is hidden.
- **Client (Call):** `@supabase/supabase-js` (MIT, GPL-compatible), imported dynamically only when the user opens the login flow or a session is restored.
- **Schema** (`supabase/migrations/0001_init.sql`): `repertoires`, `nodes`, `learned`, `reviews`, `drills`, each with `user_id uuid references auth.users on delete cascade default auth.uid()`, RLS enabled, one policy per table `using (user_id = auth.uid()) with check (user_id = auth.uid())`. Primary keys are `(user_id, ...)` of the Dexie keys. A function `save_repertoire(rep jsonb)` replaces a repertoire and its nodes in one transaction (security invoker, so RLS applies).
- **Stores:** `SupabaseRepertoireStore` and `SupabaseProgressStore` implement the existing interfaces over a minimal client interface, so they can be unit tested with a fake. Row mapping reuses `toRows`/`fromRows`.
- **Switching:** `SwitchableRepertoireStore` and `SwitchableProgressStore` hold a current backend and swap it on login or logout. After a swap the UI reloads its data.
- **Migrating guest data:** a pure function copies all local repertoires and progress through the two interfaces into the target stores. Run on demand from a button after login; never automatic.
- **Auth state:** a small module exposing `signIn`, `signUp`, `signOut`, `getSession` and a subscription, behind an interface, with a fake in tests.
- **Deploy:** `vite.config.ts` gets `base` from `VITE_BASE` (default `/`); the workflow sets it to `/Varianto/`. Hash routing means no 404 fallback is needed. Workflow `.github/workflows/pages.yml` runs on `main`, runs the three checks, builds, and uses `actions/deploy-pages`.

## Left to the owner

Creating the Supabase project, running the migration, setting the two repository variables, enabling GitHub Pages (source: GitHub Actions), and pushing. These need the owner's accounts.
