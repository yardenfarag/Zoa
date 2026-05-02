"use client"

import dynamic from "next/dynamic"
import type { HomeFigurine } from "@/lib/api"

const PetriDish = dynamic(
  () =>
    import("@/components/home/PetriDish").then((m) => ({
      default: m.PetriDish,
    })),
  {
    ssr: false,
    loading: () => (
      <div
        className="pointer-events-none fixed inset-0 z-0 bg-background"
        aria-hidden
      />
    ),
  },
)

interface HomePetriDishProps {
  figurines: HomeFigurine[]
}

/**
 * Client-only loader for the full-viewport petri dish scene. Keeps the
 * heavyweight Three.js / animation code out of the SSR bundle and provides a
 * neutral full-bleed skeleton while the client chunk hydrates.
 * @param props.figurines - Renderable bacteria/virus specimens (with their
 *   render-specs) server-fetched on the home route.
 * @returns The dynamically loaded `PetriDish`.
 */
export function HomePetriDish(props: HomePetriDishProps) {
  return <PetriDish figurines={props.figurines} />
}
