import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

const UA =
  "ZoaArchive/1.0 (image proxy; educational use; respects Wikimedia User-Agent policy)"

const MAX_URL_LEN = 2048
const CACHE_TTL_MS = 1000 * 60 * 60 * 6
const MAX_ENTRIES = 200

type CacheEntry = { body: ArrayBuffer; contentType: string; expiresAt: number }

const cache = new Map<string, CacheEntry>()

function isAllowedCommonsUrl(url: URL): boolean {
  if (url.protocol !== "https:") return false
  if (url.hostname !== "upload.wikimedia.org") return false
  if (!url.pathname.startsWith("/wikipedia/commons/")) return false
  if (url.username || url.password) return false
  return true
}

function getCached(key: string): CacheEntry | undefined {
  const hit = cache.get(key)
  if (!hit) return undefined
  if (Date.now() > hit.expiresAt) {
    cache.delete(key)
    return undefined
  }
  return hit
}

function imageResponse(body: ArrayBuffer, contentType: string) {
  return new NextResponse(new Blob([body], { type: contentType }), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  })
}

function setCached(key: string, body: ArrayBuffer, contentType: string) {
  if (cache.size >= MAX_ENTRIES) {
    const first = cache.keys().next().value
    if (first) cache.delete(first)
  }
  cache.set(key, {
    body,
    contentType,
    expiresAt: Date.now() + CACHE_TTL_MS,
  })
}

function retryAfterMs(header: string | null, attempt: number): number {
  if (!header) return 1200 * (attempt + 1)
  const sec = parseInt(header.trim(), 10)
  if (Number.isFinite(sec) && sec >= 0) {
    return Math.min(sec * 1000, 10_000)
  }
  return 1200 * (attempt + 1)
}

/** Fetches upstream; returns `null` if every attempt throws (e.g. TLS/DNS/offline). */
async function fetchUpstream(canonical: string): Promise<Response | null> {
  let attempt = 0
  while (attempt < 3) {
    try {
      const res = await fetch(canonical, {
        headers: {
          "User-Agent": UA,
          Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        },
        cache: "no-store",
      })

      if (res.status === 429 && attempt < 2) {
        await new Promise((r) =>
          setTimeout(r, retryAfterMs(res.headers.get("retry-after"), attempt)),
        )
        attempt += 1
        continue
      }
      return res
    } catch (err) {
      console.error("[api/media] fetch failed:", canonical, err)
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)))
        attempt += 1
        continue
      }
      return null
    }
  }
  return null
}

export async function GET(req: NextRequest) {
  try {
    const raw = req.nextUrl.searchParams.get("u")
    if (!raw || raw.length > MAX_URL_LEN) {
      return new NextResponse("Missing or invalid u", { status: 400 })
    }

    let canonical: string
    try {
      canonical = new URL(raw).toString()
    } catch {
      return new NextResponse("Invalid URL", { status: 400 })
    }

    let parsed: URL
    try {
      parsed = new URL(canonical)
    } catch {
      return new NextResponse("Invalid URL", { status: 400 })
    }

    if (!isAllowedCommonsUrl(parsed)) {
      return new NextResponse("URL not allowed", { status: 400 })
    }

    const cached = getCached(canonical)
    if (cached) {
      return imageResponse(cached.body, cached.contentType)
    }

    const upstream = await fetchUpstream(canonical)
    if (!upstream) {
      return new NextResponse("Could not reach Wikimedia", { status: 502 })
    }
    if (!upstream.ok) {
      return new NextResponse(null, { status: upstream.status })
    }

    const contentType =
      upstream.headers.get("content-type") ?? "application/octet-stream"
    if (!contentType.startsWith("image/")) {
      return new NextResponse("Not an image", { status: 415 })
    }

    const buf = await upstream.arrayBuffer()
    setCached(canonical, buf, contentType)

    return imageResponse(buf, contentType)
  } catch (err) {
    console.error("[api/media]", err)
    return new NextResponse("Image proxy error", { status: 502 })
  }
}
