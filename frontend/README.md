# ZOA

Microbiological archive interface built with Next.js, React, Tailwind CSS v4, and Framer Motion.

## Current status

The project currently ships a polished home experience and shared shell layout:

- Fixed `Topbar` with branded title and archive search input UI
- Animated, collapsible left `Sidebar` with category navigation
- Full-page `Shell` layout that wraps app routes
- Interactive `PetriDish` hero on the home route with:
  - Floating microbe field
  - Cursor-tracked magnifying lens
  - Spring-smoothed lens motion and zoomed overlay
- Custom icon components for `Bacteria`, `Amoeba`, `Mushroom`, and `Virus`
- Dark archive theme with scarlet/gold/parchment palette and glass styling

## Tech stack

- `Next.js 16` (App Router)
- `React 19` + `TypeScript`
- `Tailwind CSS 4`
- `Framer Motion`
- `lucide-react`
- `shadcn` utilities and styling primitives
- [Supabase](https://supabase.com/) (`@supabase/supabase-js`, `@supabase/ssr`) for production data and auth-ready cookies

## Supabase

1. Create a project in the [Supabase dashboard](https://supabase.com/dashboard).
2. Copy [`.env.example`](.env.example) to `.env.local` in this folder.
3. Set `NEXT_PUBLIC_SUPABASE_URL` and either `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` (from **Project Settings → API**). Never expose the **service_role** key to the browser.

Use:

- **Server Components / Server Actions / Route Handlers:** `import { createClient } from "@/lib/supabase/server"` then `const supabase = await createClient()`.
- **Client Components:** `import { createClient } from "@/lib/supabase/client"` then `const supabase = createClient()`.

[`middleware.ts`](middleware.ts) refreshes the auth session when Supabase is configured. If env vars are missing, it no-ops so local builds still work.

## Project structure

This package lives under `frontend/` in the monorepo:

```text
frontend/
  app/
    layout.tsx        # Global layout + fonts + Shell wrapper
    page.tsx          # Home route with PetriDish
    globals.css       # Theme tokens and custom styles

  components/
    home/PetriDish.tsx
    layout/Shell.tsx
    layout/Sidebar.tsx
    layout/Topbar.tsx
    icons/
      BacteriaIcon.tsx
      AmoebaIcon.tsx
      MushroomIcon.tsx
      VirusIcon.tsx
```

## Getting started

From the **repository root**:

```bash
npm install
npm run dev
```

Or from this folder:

```bash
cd frontend
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

### Archive API (microbe list/detail pages)

Category routes (`/bacteria`, `/parasites`, etc.) call the Nest API. From the repo root:

1. `docker compose up -d`
2. `npm run dev:api`
3. `npm run seed:api` (first time, inserts 10 demo microbes)
4. `npm run dev` — open e.g. `/bacteria`

5. If cards show **no thumbnails**, run from the repo root: `npm run sync-images:api` (fills from Wikimedia Commons; add `-- --force` to overwrite URLs).

Set `NEXT_PUBLIC_API_URL` in `.env.local` if the API is not on `http://localhost:3001`.

## Available scripts

- `npm run dev` - start development server
- `npm run build` - create production build
- `npm run start` - run production server
- `npm run lint` - run ESLint

## Notes

- Sidebar links for organism categories are scaffolded in the UI.
- Only the home route (`/`) is currently implemented with full content.
