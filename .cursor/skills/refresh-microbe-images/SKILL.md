---
name: refresh-microbe-images
description: Fill or replace Zoa microbe preview images. Uses AI Vision to evaluate multiple Wikimedia Commons candidates and pick the 2 best images per microbe, then uploads them to Cloudflare R2.
---

# Refresh microbe images (Zoa archive)

## When to use

- List/detail cards show **no image** or **broken thumbnails**.
- You want better images than the current ones.
- You want the 2 best-quality Commons micrographs per microbe, selected by visual inspection.

## Preconditions

1. **Postgres** running: `docker compose up -d` from repo root.
2. **Nest API** running: `npm run dev:api` (default **http://localhost:3001**).
3. **R2 env** set: `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_BASE_URL` must all be present in the root `.env`.

---

## Option A — AI-curated (recommended)

The agent evaluates multiple Wikimedia Commons candidates using Vision and picks the **2 best images** per microbe, then uploads them to R2 via the API.

### Step-by-step workflow

**For each microbe** (get the full list first: `GET http://localhost:3001/microbes?type=bacteria`, repeat for all 5 types):

#### 1. Search Commons for up to 8 candidates

Run multiple search queries and collect unique file titles (up to 8 total):

```powershell
# Query 1: micrograph search
Invoke-RestMethod "https://commons.wikimedia.org/w/api.php?action=query&list=search&srnamespace=6&srlimit=8&format=json&srsearch=Escherichia+coli+micrograph+filetype:bitmap"

# Query 2: microscopy search (if fewer than 8 results above)
Invoke-RestMethod "https://commons.wikimedia.org/w/api.php?action=query&list=search&srnamespace=6&srlimit=8&format=json&srsearch=Escherichia+coli+microscopy+filetype:bitmap"
```

Collect the `query.search[].title` values (e.g. `File:E_coli_SEM.jpg`).

#### 2. Batch-resolve thumbnail URLs in one request

Pipe-join up to 8 titles and resolve their URLs in a single API call:

```powershell
Invoke-RestMethod "https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url&iiurlwidth=800&format=json&titles=File:A.jpg|File:B.jpg|File:C.jpg"
```

Extract `query.pages[*].imageinfo[0].thumburl` for each page.

#### 3. Evaluate candidates with Vision

Look at each thumbnail URL. Pick the **2 best images** where:

- The **whole organism** (or a representative specimen) is clearly visible
- The **shape and structure** are unambiguous — you can see the morphology
- It is a **real photograph or electron micrograph**, not a diagram, illustration, or labelled figure
- Prefer images that show **different aspects** (e.g. one SEM overview, one closer view or different life stage)
- If fewer than 2 good images exist, pick only 1 (or 0 if all are unsuitable)

#### 4. Upload the selected images to R2

Call the backend endpoint once per chosen image. Use `overwrite` for the first, `append` for the second:

```powershell
# First image — overwrites existing image_urls
Invoke-RestMethod -Method Post -Uri "http://localhost:3001/microbes/<id>/upload-image" `
  -ContentType "application/json" `
  -Body '{"sourceUrl":"<1st best thumburl>","mode":"overwrite"}'

# Wait ~1 second (polite to R2 and Commons)
Start-Sleep -Seconds 1

# Second image — appends to image_urls
Invoke-RestMethod -Method Post -Uri "http://localhost:3001/microbes/<id>/upload-image" `
  -ContentType "application/json" `
  -Body '{"sourceUrl":"<2nd best thumburl>","mode":"append"}'
```

On Unix/bash:

```bash
curl -sS -X POST "http://localhost:3001/microbes/<id>/upload-image" \
  -H "Content-Type: application/json" \
  -d '{"sourceUrl":"<1st best thumburl>","mode":"overwrite"}'

sleep 1

curl -sS -X POST "http://localhost:3001/microbes/<id>/upload-image" \
  -H "Content-Type: application/json" \
  -d '{"sourceUrl":"<2nd best thumburl>","mode":"append"}'
```

The backend downloads the bitmap with a proper `User-Agent`, uploads to R2, and saves the public URL in `image_urls`.

#### 5. Move to the next microbe

Wait ~1 second between microbes. Repeat for all types: `bacteria`, `fungus`, `virus`, `parasite`, `amoeba`.

---

## Option B — automated script (first-result only, no AI selection)

Uses the existing backfill script which takes the **first** Commons search result without visual evaluation. Faster but lower quality.

From the **repo root**:

```bash
npm run sync-images:api          # fills only rows with empty image_urls
npm run sync-images:api:force    # overwrites all existing images
```

Requires `R2_*` env to be set; prints `R2 upload ON` or `R2 upload OFF` on start.

---

## Option C — agent-curated URLs (manual PATCH)

1. Find a specific Commons URL you want via WebSearch.
2. PATCH it directly (stores Commons URL, no R2 upload):

```powershell
Invoke-RestMethod -Method Patch -Uri "http://localhost:3001/microbes/<id>" `
  -ContentType "application/json" `
  -Body '{"image_urls":["https://upload.wikimedia.org/..."]}'
```

---

## Notes

- **Option A is preferred** — it gives the 2 visually best images per microbe stored in R2.
- The `upload-image` endpoint uses `fetchCommonsBitmap` with retry logic for 429s.
- Commons URLs served directly in `<img>` tags are often rate-limited (429). The frontend rewrites them to `/api/media?u=…` which proxies with caching — so raw Commons URLs in `image_urls` still work in the UI.
- Never commit real R2 or API keys.
