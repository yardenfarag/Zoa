---
name: create-microbe
description: Research a microbe and add it to the Zoa archive via the Nest API (local Docker Postgres).
---

# Create microbe (Zoa archive)

Use this skill when the user wants to **add a new microbe** to the database through the backend API.

## Preconditions

1. **Postgres** running: from the Zoa repo root, `docker compose up -d` (port **5556**).
2. **Nest API** running: `npm run dev:api` (default **http://localhost:3001**).
3. If the table is empty, seed the demo set once: `npm run seed:api`.

## Workflow

1. **Collect inputs** — microbe **name**, **type** (`bacteria` | `fungus` | `virus` | `parasite` | `amoeba`), and optional notes from the user.
2. **Research** — use **WebSearch** to fill:
   - `size` (short, concrete; include units when possible)
   - `natural_habitat`
   - `capabilities` (metabolic, ecological, or clinical angle — keep factual)
   - `description` (2–4 sentences, plain language)
3. **Images** — if the user uses **Cloudflare R2**, use **`image_urls: []`** (or omit) and run **`npm run sync-images:api`** after create (or **`npm run sync-images:api:force`** to replace images): that script finds Commons thumbnails and **uploads bytes to R2** when `R2_*` env is complete. **Do not** paste `upload.wikimedia.org` URLs into POST/PATCH if the goal is R2-hosted files — that skips the uploader. If R2 is not in use, 1–3 HTTPS Commons (or other clearly reusable) URLs are fine.
4. **Create via API** — run from the repo root (PowerShell):

```powershell
$body = @{
  name = "ORGANISM NAME"
  size = "SIZE WITH UNITS"
  natural_habitat = "HABITAT"
  capabilities = "CAPABILITIES"
  description = "DESCRIPTION"
  image_urls = @("https://...")
  type = "bacteria"
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri "http://localhost:3001/microbes" -Body $body -ContentType "application/json"
```

Use **bash** when the user is on Unix:

```bash
curl -sS -X POST "http://localhost:3001/microbes" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Organism name",
    "size": "Size with units",
    "natural_habitat": "Habitat",
    "capabilities": "Capabilities",
    "description": "Description",
    "image_urls": ["https://..."],
    "type": "bacteria"
  }'
```

5. **Confirm** — print the JSON response (should include `id`). Tell the user the specimen URL path: `/{slug}/{id}` where `slug` is `bacteria`, `parasites`, `fungus`, `amoebas`, or `viruses` matching the enum (`parasite` → `parasites`, etc.).

## After create — images

- **R2 path:** With `R2_*` env set, run **`npm run sync-images:api`** (fills empty `image_urls`) or **`npm run sync-images:api:force`** (re-fetch + re-upload). Check stderr for **`R2 upload ON`**; if it says **`OFF`**, fix env then re-run.
- **No R2:** same commands save **Commons URLs** only; or **PATCH** `image_urls` with researched `https://...` links.

## Validation rules (API)

- All string fields required except `image_urls` (optional array).
- `type` must be one of: `bacteria`, `fungus`, `virus`, `parasite`, `amoeba`.
- `image_urls` entries must be valid URLs if provided.

## Notes

- **Do not** send Supabase `service_role` keys into user-visible commands.
- For **production** on Supabase, mirror the schema using `docs/supabase/microbes.sql` and insert via dashboard or a secured path—not anonymous broad insert unless policy is intentional.
