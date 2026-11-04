# Deploying Varianto

Varianto is a static site. Guest mode needs nothing else. Accounts (optional) need a Supabase project.

## 1. Supabase (only if you want accounts)

1. Create a project at supabase.com.
2. Open the SQL editor and run `supabase/migrations/0001_init.sql`. It creates the tables, turns on Row Level Security, and adds `save_repertoires`.
3. Under Authentication, decide whether email confirmation is required. Varianto handles both.
4. Under Authentication > URL configuration, add your site URL (for example `https://yaminbkk.github.io/Varianto/`).
5. Copy the project URL and the anon (public) key from Project Settings > API. The anon key is safe to publish; Row Level Security protects the data. Never use the service-role key.

Without step 5 the build has no login and runs as a guest app.

## 2. GitHub Pages

1. Repository Settings > Pages > Source: **GitHub Actions**.
2. Repository Settings > Secrets and variables > Actions > Variables: add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (skip both for a guest-only site).
3. Push to `main`. `.github/workflows/pages.yml` runs the tests and lint, builds with `VITE_BASE=/Varianto/`, and publishes `dist`.

## Local development with accounts

Copy `.env.example` to `.env.local`, fill both values, and run `npm run dev`.
