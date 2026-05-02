"use client"

import dynamic from "next/dynamic"
import type { BacteriumRenderSpec } from "@/lib/render-spec"

const ParasiteViewer = dynamic(() => import("./ParasiteViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] items-center justify-center rounded-xl border border-gold/15 bg-black/40">
      <p className="text-xs text-parchment/30">Loading viewer…</p>
    </div>
  ),
})

/**
 * Dynamic import wrapper for ParasiteViewer (R3F requires no SSR).
 * @param spec - Render spec from GET /microbes/:id/render-spec
 */
export default function ParasiteViewerLoader({
  spec,
}: {
  spec: BacteriumRenderSpec
}) {
  return <ParasiteViewer spec={spec} />
}
