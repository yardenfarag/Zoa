# Zoa

**Zoa** is a dark, archive-style encyclopedia of microorganisms. Browse and explore bacteria, parasites, fungi, amoebas, and viruses — each with images, habitat info, size, and capabilities pulled from a Postgres-backed NestJS API.

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Framer Motion |
| Backend | NestJS 11, TypeORM, PostgreSQL 16 |
| Media | Cloudflare R2 (optional) — falls back to Wikimedia Commons URLs |
| Production data | Supabase (optional) |
| Infrastructure | Docker Compose (Postgres only) |

## Monorepo layout

```
zoa/
├── frontend/        # Next.js app
├── backend/         # NestJS API
├── docs/            # Plans and SQL schema
│   ├── plans/       # Feature planning docs
│   └── supabase/    # microbes.sql for hosted DB
└── docker-compose.yml
```

## Pages

| Route | Description |
| --- | --- |
| `/` | Home — interactive Petri dish hero |
| `/[type]` | Category archive — card grid for bacteria, parasites, fungus, amoebas, or viruses |
| `/[type]/[id]` | Microbe detail — image gallery, habitat, capabilities, description |

## Getting started

### 1. Install

From the repository root (installs all workspaces):

```bash
npm install
```

### 2. Configure environment

Copy the example env files and fill in your values:

```bash
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
```

**`frontend/.env.local`**

```env
NEXT_PUBLIC_API_URL=http://localhost:3001

# Optional — only needed if using Supabase for production data
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

**`backend/.env`**

```env
DB_HOST=localhost
DB_PORT=5556
DB_USERNAME=zoa
DB_PASSWORD=zoa
DB_NAME=zoa_db
TYPEORM_SYNC=true

# Optional — Cloudflare R2 for image hosting
R2_ENDPOINT=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_REGION=auto
R2_PUBLIC_BASE_URL=
```

### 3. Start Postgres

```bash
docker compose up -d
```

This starts a Postgres 16 instance on port **5556**.

### 4. Run the API

```bash
npm run dev:api
```

The API starts at `http://localhost:3001`.

### 5. Seed demo data

On first run, seed the database with 10 sample microbes:

```bash
npm run seed:api
```

### 6. Attach images

Fetch thumbnails from Wikimedia Commons and store them (uploads to R2 if configured, otherwise stores the Commons URL directly):

```bash
npm run sync-images:api
```

To replace existing image URLs, use the `--force` variant:

```bash
npm run sync-images:api:force
```

### 7. Start the frontend

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts (root)

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the Next.js dev server |
| `npm run dev:api` | Start the NestJS dev server |
| `npm run seed:api` | Seed the database with demo microbes |
| `npm run sync-images:api` | Attach Wikimedia/R2 image URLs to seeded microbes |
| `npm run sync-images:api:force` | Same, but replaces existing URLs |
| `npm run build` | Build the frontend |
| `npm run build:api` | Build the backend |

## Production (Supabase)

To use Supabase as the hosted data layer, apply the schema in [`docs/supabase/microbes.sql`](docs/supabase/microbes.sql) to your Supabase project, then add the `NEXT_PUBLIC_SUPABASE_*` keys to your frontend env.

## Docs

Planning documents live in [`docs/plans/`](docs/plans/):

- [`01-topbar-branding.md`](docs/plans/01-topbar-branding.md) — branding and topbar design
- [`02-monorepo-deployment.md`](docs/plans/02-monorepo-deployment.md) — monorepo and deployment strategy
- [`03-supabase-data-layer.md`](docs/plans/03-supabase-data-layer.md) — Supabase integration
- [`zoa_backend_and_microbe_pages_21d64019.plan.md`](docs/plans/zoa_backend_and_microbe_pages_21d64019.plan.md) — backend and microbe pages plan
