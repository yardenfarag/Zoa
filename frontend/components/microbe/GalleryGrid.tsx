"use client"

import { useState, useEffect } from "react"

interface GalleryGridProps {
  srcs: string[]
}

export function GalleryGrid({ srcs }: GalleryGridProps) {
  const [active, setActive] = useState<string | null>(null)

  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(null)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [active])

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        {srcs.map((src, i) => (
          <button
            key={`${src}-${i}`}
            onClick={() => setActive(src)}
            className="group cursor-pointer overflow-hidden rounded-2xl border border-gold/15 bg-black/30 transition-all duration-300 hover:border-gold/40 hover:shadow-[0_0_20px_rgba(212,175,55,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
            aria-label="View full image"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              referrerPolicy="no-referrer"
              loading="lazy"
              className="aspect-video w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          </button>
        ))}
      </div>

      {active && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setActive(null)}
        >
          <div
            className="relative mx-4 max-h-[90vh] max-w-5xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setActive(null)}
              className="absolute -top-10 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-gold/30 bg-black/60 text-parchment/70 transition-colors hover:border-gold/60 hover:text-parchment"
              aria-label="Close"
            >
              ✕
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={active}
              alt=""
              referrerPolicy="no-referrer"
              className="max-h-[85vh] w-full rounded-2xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </>
  )
}
