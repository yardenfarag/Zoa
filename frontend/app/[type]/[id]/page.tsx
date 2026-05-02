import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import {
  apiTypeToSlug,
  archiveTitle,
  isArchiveSlug,
  slugToApiType,
} from "@/lib/microbe-routes"
import { coalesceImageUrls, fetchMicrobeById, fetchRenderSpec, publicImageSrc } from "@/lib/api"
import { GalleryGrid } from "@/components/microbe/GalleryGrid"
import BacteriaViewerLoader from "@/components/microbe/BacteriaViewerLoader"
import VirusViewerLoader from "@/components/microbe/VirusViewerLoader"
import ParasiteViewerLoader from "@/components/microbe/ParasiteViewerLoader"
import type { BacteriumRenderSpec } from "@/lib/render-spec"
interface PageProps {
  params: Promise<{ type: string; id: string }>
}

export default async function MicrobeDetailPage({ params }: PageProps) {
  const { type: raw, id } = await params
  if (!isArchiveSlug(raw)) notFound()

  const slug = raw
  const expectedType = slugToApiType(slug)

  let microbe: Awaited<ReturnType<typeof fetchMicrobeById>> | null = null
  let renderSpec: BacteriumRenderSpec | null = null
  let loadError: string | null = null
  try {
    microbe = await fetchMicrobeById(id)
    if (
      microbe &&
      (microbe.type === "bacteria" ||
        microbe.type === "virus" ||
        microbe.type === "parasite")
    ) {
      renderSpec = await fetchRenderSpec(id)
    }
  } catch {
    loadError =
      "Could not reach the archive API. Start Postgres, `npm run dev:api`, and try again."
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <p className="rounded-lg border border-scarlet/40 bg-scarlet/10 px-4 py-3 text-sm text-parchment">
          {loadError}
        </p>
        <Link
          href={`/${slug}`}
          className="mt-6 inline-block text-sm text-gold hover:underline"
        >
          ← Back to {archiveTitle(slug)}
        </Link>
      </div>
    )
  }

  if (!microbe) notFound()

  if (microbe.type !== expectedType) {
    redirect(`/${apiTypeToSlug(microbe.type)}/${microbe.id}`)
  }

  const listHref = `/${slug}`
  const images = coalesceImageUrls(microbe.image_urls)

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-center gap-3 text-sm text-parchment/60">
        <Link
          href={listHref}
          className="rounded-md border border-gold/20 px-3 py-1 text-parchment/80 transition-colors hover:border-gold/50 hover:text-parchment"
        >
          ← Back to {archiveTitle(slug)}
        </Link>
        <span className="rounded-full border border-gold/25 bg-scarlet/30 px-3 py-1 text-xs uppercase tracking-wide text-gold">
          {microbe.type}
        </span>
      </div>

      <header className="space-y-3">
        <h1 className="font-heading text-4xl tracking-wide text-gold">
          {microbe.name}
        </h1>
        <p className="text-sm text-parchment/60">{microbe.size}</p>
      </header>

      {renderSpec && renderSpec.renderable ? (
        <section className="mt-10 space-y-4">
          <h2 className="text-xs uppercase tracking-[0.2em] text-gold/60">
            Anatomy
          </h2>
          {microbe.type === "virus" ? (
            <VirusViewerLoader spec={renderSpec} />
          ) : microbe.type === "parasite" ? (
            <ParasiteViewerLoader spec={renderSpec} />
          ) : (
            <BacteriaViewerLoader spec={renderSpec} />
          )}
        </section>
      ) : null}

      <section className="mt-10 space-y-4">
        <h2 className="text-xs uppercase tracking-[0.2em] text-gold/60">
          Gallery
        </h2>

        {images.length > 0 ? (
          <GalleryGrid srcs={images.map(publicImageSrc)} />
        ) : (
          <p className="text-sm text-parchment/40">No images yet.</p>
        )}
      </section>

      <section className="mt-10 grid gap-6 sm:grid-cols-2">
        <div>
          <h2 className="text-xs uppercase tracking-[0.2em] text-gold/60">
            Natural habitat
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-parchment/85">
            {microbe.natural_habitat}
          </p>
        </div>
        <div>
          <h2 className="text-xs uppercase tracking-[0.2em] text-gold/60">
            Capabilities
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-parchment/85">
            {microbe.capabilities}
          </p>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xs uppercase tracking-[0.2em] text-gold/60">
          Description
        </h2>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-parchment/90">
          {microbe.description}
        </p>
      </section>
    </div>
  )
}
