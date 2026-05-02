# Plan: Supabase data layer

## Goal

Use **Supabase** (hosted Postgres + generated APIs) so **production** can store and serve real archive data without operating our own database server for the first phase of the product.

## Principles

- **Browser-safe keys only:** `NEXT_PUBLIC_SUPABASE_URL` plus **anon** or **publishable** key in the Next app. Never ship **service_role** to the client.
- **Row Level Security (RLS):** every table exposed to the anon key must have explicit policies; treat RLS as the real authorization layer for user-scoped data.
- **Nest (optional later):** use **service_role** only on the server (`backend/`) for admin jobs, migrations, or endpoints that cannot be expressed safely with RLS—never in `NEXT_PUBLIC_*`.

## What is implemented (frontend)

- Dependencies: `@supabase/supabase-js`, `@supabase/ssr`.
- Env template: `frontend/.env.example`.
- Helpers:
  - `frontend/lib/supabase/server.ts` — `createClient()` for Server Components, Server Actions, Route Handlers.
  - `frontend/lib/supabase/client.ts` — `createClient()` for Client Components.
  - `frontend/lib/supabase/env.ts` — URL + key resolution (publishable or anon).
- Session refresh: `frontend/middleware.ts` → `frontend/lib/supabase/middleware.ts` (no-op if env is missing so local/CI builds still run).

## Using Supabase in features

1. Define tables and relationships in the Supabase SQL editor (or migrations via Supabase CLI).
2. Enable **RLS** and add `SELECT` / `INSERT` / `UPDATE` / `DELETE` policies as needed.
3. In Next:
   - Prefer **server** `createClient()` for reads that should not leak extra surface to the browser.
   - Use **client** `createClient()` when you need subscriptions, client-only flows, or progressive enhancement.

## Near-term backlog

- [x] Initial `microbes` shape for the archive UI — see [`docs/supabase/microbes.sql`](../supabase/microbes.sql) (local API uses the same columns via Nest/TypeORM).
- [ ] Agree on core tables (e.g. organisms, media, taxonomy, provenance) and naming.
- [ ] Add SQL migrations (Supabase CLI `supabase/migrations` or dashboard-exported SQL) to the repo when the schema stabilizes.
- [ ] Generate **TypeScript types** from the database (`supabase gen types`) and wire `Database` generic into `createClient` for autocomplete.
- [ ] Replace scaffold sidebar routes with real list/detail pages backed by `from('…').select(…)`.
- [ ] If we add auth: use `supabase.auth.getUser()` / `getClaims()` patterns from current Supabase Next docs; keep middleware/proxy in sync with Next releases.

## References

- Roadmap that includes Supabase + microbe pages: [zoa_backend_and_microbe_pages_21d64019.plan.md](zoa_backend_and_microbe_pages_21d64019.plan.md)
- Supabase dashboard: [https://supabase.com/dashboard](https://supabase.com/dashboard)
- SSR + Next: [Creating a Supabase client for SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs&queryGroups=package-manager&package-manager=npm)
