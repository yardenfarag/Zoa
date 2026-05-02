"use client"

import dynamic from "next/dynamic"
import type { BacteriumRenderSpec } from "@/lib/render-spec"

const VirusViewer = dynamic(() => import("./VirusViewer"), { ssr: false })

/**
 * Client component wrapper that dynamically imports VirusViewer with SSR
 * disabled. Required because React Three Fiber uses browser-only APIs.
 *
 * @param spec - Render spec from GET /microbes/:id/render-spec
 */
export default function VirusViewerLoader({ spec }: { spec: BacteriumRenderSpec }) {
  return <VirusViewer spec={spec} />
}
