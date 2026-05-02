import Link from "next/link"
import { notFound } from "next/navigation"
import {
  apiTypeToSlug,
  archiveTitle,
  isArchiveSlug,
  slugToApiType,
} from "@/lib/microbe-routes"
import {
  coalesceImageUrls,
  fetchMicrobesByType,
  publicImageSrc,
} from "@/lib/api"

interface PageProps {
  params: Promise<{ type: string }>
}

export default async function MicrobeListPage({ params }: PageProps) {
  const { type: raw } = await params
  if (!isArchiveSlug(raw)) notFound()

  const slug = raw
  const apiType = slugToApiType(slug)

  let microbes: Awaited<ReturnType<typeof fetchMicrobesByType>>
  let error: string | null = null
  try {
    microbes = await fetchMicrobesByType(apiType)
  } catch {
    microbes = []
    error =
      "Could not reach the archive API. Start Postgres (`docker compose up -d`), the API (`npm run dev:api`), and seed (`npm run seed:api`)."
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-10">
        <p className="text-xs uppercase tracking-[0.2em] text-gold/60">
          Zoa archive
        </p>
        <h1 className="font-heading mt-2 text-3xl tracking-wide text-gold">
          {archiveTitle(slug)}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-parchment/70">
          Specimens filed under this category. Select a card to open the full
          record.
        </p>
      </header>

      {error ? (
        <div className="rounded-lg border border-scarlet/40 bg-scarlet/10 px-4 py-3 text-sm text-parchment">
          {error}
        </div>
      ) : null}

      {!error && microbes.length === 0 ? (
        <div className="rounded-lg border border-gold/20 bg-white/5 px-4 py-6 text-sm text-parchment/80">
          No microbes in this category yet. From the repo root run{" "}
          <code className="rounded bg-black/40 px-1.5 py-0.5 text-xs text-gold">
            npm run seed:api
          </code>{" "}
          after the database and API are up.
        </div>
      ) : null}

      <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {microbes.map((m) => {
          const href = `/${apiTypeToSlug(m.type)}/${m.id}`
          const cover = coalesceImageUrls(m.image_urls)[0]
          return (
            <li key={m.id}>
              <Link
                href={href}
                className="group block overflow-hidden rounded-xl border border-gold/15 bg-card/60 transition-colors hover:border-gold/40"
              >
                <div className="relative aspect-[4/3] bg-black/40">
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={publicImageSrc(cover)}
                      alt=""
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      className="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-parchment/40">
                      No image
                    </div>
                  )}
                </div>
                <div className="space-y-2 px-4 py-4">
                  <h2 className="font-heading text-lg text-gold group-hover:text-gold/90">
                    {m.name}
                  </h2>
                  <p className="text-xs text-parchment/55">{m.size}</p>
                  <p className="line-clamp-2 text-sm text-parchment/75">
                    {m.natural_habitat}
                  </p>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
