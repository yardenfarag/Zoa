export type MicrobeTypeApi =
  | "bacteria"
  | "fungus"
  | "virus"
  | "parasite"
  | "amoeba"

export interface Microbe {
  id: string
  name: string
  size: string
  natural_habitat: string
  capabilities: string
  description: string
  image_urls: string[]
  type: MicrobeTypeApi
  created_at: string
}

/** Normalizes API quirks (JSON string, legacy comma-joined URLs). */
export function coalesceImageUrls(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((x): x is string => typeof x === "string" && x.length > 0)
  }
  if (typeof raw === "string") {
    const t = raw.trim()
    if (!t) return []
    if (t.startsWith("[")) {
      try {
        const parsed: unknown = JSON.parse(t)
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (x): x is string => typeof x === "string" && x.length > 0,
          )
        }
      } catch {
        return []
      }
    }
    return t
      .split(/,(?=https?:\/\/)/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
  }
  return []
}

/**
 * Serves Wikimedia Commons files through `/api/media` so the browser does not
 * hit upload.wikimedia.org directly (avoids 429 + satisfies User-Agent policy).
 */
export function publicImageSrc(original: string): string {
  try {
    const u = new URL(original)
    if (
      u.protocol === "https:" &&
      u.hostname === "upload.wikimedia.org" &&
      u.pathname.startsWith("/wikipedia/commons/")
    ) {
      return `/api/media?u=${encodeURIComponent(original)}`
    }
  } catch {
    return original
  }
  return original
}

export function getApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"
  return raw.replace(/\/$/, "")
}

export async function fetchMicrobesByType(
  type: MicrobeTypeApi,
): Promise<Microbe[]> {
  const res = await fetch(
    `${getApiBaseUrl()}/microbes?type=${encodeURIComponent(type)}`,
    { cache: "no-store" },
  )
  if (!res.ok) {
    throw new Error(`Microbes list failed (${res.status})`)
  }
  return res.json() as Promise<Microbe[]>
}

/**
 * One microbe paired with its render-spec, ready to mount as a 3D figurine
 * on the home page. Only `bacteria` and `virus` types are currently
 * renderable in the codebase.
 */
export interface HomeFigurine {
  microbe: Microbe
  kind: "bacterium" | "virus"
  spec: import("./render-spec").BacteriumRenderSpec
}

/**
 * Selects up to `limit` random items from `items` using Fisher–Yates.
 * Pure helper; produces a new array and does not mutate the input.
 * @param items - Source array.
 * @param limit - Maximum number of items to keep.
 * @returns A new array with up to `limit` random items from `items`.
 */
function pickRandom<T>(items: T[], limit: number): T[] {
  const copy = items.slice()
  const out: T[] = []
  const take = Math.min(limit, copy.length)
  for (let i = 0; i < take; i++) {
    const idx = Math.floor(Math.random() * copy.length)
    out.push(copy[idx])
    copy.splice(idx, 1)
  }
  return out
}

/**
 * Fetches up to `limit` random bacteria/virus microbes paired with their
 * render-specs, ready to mount as floating 3D figurines on the home page.
 * Tolerates per-microbe spec-fetch failures (a missing spec just drops that
 * figurine from the result).
 * @param limit - Maximum number of figurines to return.
 * @returns A list of `{ microbe, kind, spec }` for renderable specimens.
 */
export async function fetchHomeFigurines(
  limit: number,
): Promise<HomeFigurine[]> {
  try {
    const lists = await Promise.allSettled([
      fetchMicrobesByType("bacteria"),
      fetchMicrobesByType("virus"),
    ])
    let pool: Microbe[] = []
    for (const r of lists) {
      if (r.status === "fulfilled") pool = pool.concat(r.value)
    }
    const picks = pickRandom(pool, limit)
    const settled = await Promise.allSettled(
      picks.map(async (m) => {
        try {
          const spec = await fetchRenderSpec(m.id)
          if (spec === null) return null
          if (!spec.renderable) return null
          const kind: "bacterium" | "virus" =
            m.type === "virus" ? "virus" : "bacterium"
          const figurine: HomeFigurine = { microbe: m, kind: kind, spec: spec }
          return figurine
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          console.error(
            `fetchHomeFigurines || fetching spec for ${m.id} || ${message} || 🐢`,
          )
          return null
        }
      }),
    )
    const figurines: HomeFigurine[] = []
    for (const r of settled) {
      if (r.status === "fulfilled" && r.value !== null) {
        figurines.push(r.value)
      }
    }
    return figurines
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(
      `fetchHomeFigurines || preparing the floating-figurines list || ${message} || 🦦`,
    )
    return []
  }
}

/**
 * Fetches every microbe across all five archive types in parallel.
 * Per-type failures are tolerated so one down endpoint cannot blank the
 * caller's UI.
 * @returns Concatenated list of microbes (possibly empty if all types fail).
 */
export async function fetchAllMicrobes(): Promise<Microbe[]> {
  const types: MicrobeTypeApi[] = [
    "bacteria",
    "fungus",
    "virus",
    "parasite",
    "amoeba",
  ]
  try {
    const results = await Promise.allSettled(
      types.map((t) => fetchMicrobesByType(t)),
    )
    let all: Microbe[] = []
    for (const r of results) {
      if (r.status === "fulfilled") {
        all = all.concat(r.value)
      }
    }
    return all
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(
      `fetchAllMicrobes || loading every archive type || ${message} || 🦊`,
    )
    return []
  }
}

export async function fetchMicrobeById(id: string): Promise<Microbe | null> {
  const res = await fetch(`${getApiBaseUrl()}/microbes/${id}`, {
    cache: "no-store",
  })
  if (res.status === 404) return null
  if (!res.ok) {
    throw new Error(`Microbe detail failed (${res.status})`)
  }
  return res.json() as Promise<Microbe>
}

/**
 * Fetches the procedural render spec for a single microbe.
 * Always resolves to a spec — check spec.renderable before rendering.
 * Returns null only on a hard 404 (microbe does not exist).
 * @param id - UUID of the microbe
 */
export async function fetchRenderSpec(
  id: string,
): Promise<import("./render-spec").BacteriumRenderSpec | null> {
  const res = await fetch(`${getApiBaseUrl()}/microbes/${id}/render-spec`, {
    cache: "no-store",
  })
  if (res.status === 404) return null
  if (!res.ok) {
    throw new Error(`Render spec fetch failed (${res.status})`)
  }
  return res.json() as Promise<import("./render-spec").BacteriumRenderSpec>
}

