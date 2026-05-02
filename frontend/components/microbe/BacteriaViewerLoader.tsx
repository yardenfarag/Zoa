"use client"

import dynamic from "next/dynamic"
import type { BacteriumRenderSpec } from "@/lib/render-spec"

/**
 * Client-side loader for BacteriaViewer.
 * Dynamically imports the R3F viewer with SSR disabled, which is required
 * by Next.js App Router — ssr:false is only allowed inside client components.
 * @param spec - Pre-fetched render spec passed from the server page
 */
const BacteriaViewer = dynamic(
  () => import("@/components/microbe/BacteriaViewer"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[420px] items-center justify-center rounded-xl border border-gold/15 bg-black/40">
        <p className="text-xs text-parchment/30">Loading viewer…</p>
      </div>
    ),
  },
)

export default function BacteriaViewerLoader({
  spec,
}: {
  spec: BacteriumRenderSpec
}) {
  return <BacteriaViewer spec={spec} />
}
