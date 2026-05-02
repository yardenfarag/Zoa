# Plan: Monorepo and deployment

## Goal

Keep **clear boundaries** between the Next.js UI and the Nest API while still having a single repo and one root install story.

## Layout

| Path | Role |
| ---- | ---- |
| `frontend/` | Next.js 16 app (App Router), UI and Supabase-backed reads/writes from the browser/server as needed. |
| `backend/` | NestJS API for privileged or orchestration logic when we outgrow “Next + Supabase only”. |
| Repo root | `package.json` workspaces, `package-lock.json`, `docker-compose.yml`, shared docs. |

## Tooling

- **Install (all workspaces):** from repo root, `npm install`.
- **Scripts (root `package.json`):** `npm run dev` → frontend; `npm run dev:api` → backend; build/lint variants per workspace.

## Deployment (high level)

- **Frontend (e.g. Vercel):** set project root to `frontend`; configure `NEXT_PUBLIC_*` Supabase vars in the host (see [Supabase data layer](03-supabase-data-layer.md)).
- **Backend:** separate service/container when exposed publicly; keep secrets out of the frontend bundle.
- **CI (future):** path-filtered jobs — `frontend/**` vs `backend/**` — so changes do not run unrelated pipelines.

## Follow-ups

- Add GitHub Actions workflows with `working-directory` or `npm run … -w <workspace>`.
- Optional `Dockerfile` per app when we containerize the API and/or web.
