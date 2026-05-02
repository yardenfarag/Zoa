-- Zoa: microbes table for Supabase (run once in SQL editor, or wrap in a migration).
-- Field names align with backend/src/microbes/microbe.entity.ts (Nest + TypeORM).

create table if not exists public.microbes (
  id uuid primary key default gen_random_uuid (),
  name text not null,
  size text not null,
  natural_habitat text not null,
  capabilities text not null,
  description text not null,
  image_urls text not null default '[]',
  type text not null check (
    type in ('bacteria', 'fungus', 'virus', 'parasite', 'amoeba')
  ),
  created_at timestamptz not null default now ()
);

alter table public.microbes enable row level security;

-- Public read for anonymous clients (tighten when auth ships)
create policy "microbes_select_public"
on public.microbes
for select
to anon
using (true);

-- Writes: use service_role from a trusted server, or add scoped policies for authenticated users.
