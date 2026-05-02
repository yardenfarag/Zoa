import { fetchHomeFigurines, type HomeFigurine } from "@/lib/api"
import { HomePetriDish } from "@/components/home/HomePetriDish"

const HOME_FIGURINE_LIMIT = 15

/**
 * Home route — server-fetches up to `HOME_FIGURINE_LIMIT` random renderable
 * bacteria/virus specimens (with their render-specs) and hands them to the
 * client-only full-bleed petri dish for animated 3D rendering.
 * @returns The home page React element.
 */
export default async function Home() {
  let figurines: HomeFigurine[] = []
  try {
    figurines = await fetchHomeFigurines(HOME_FIGURINE_LIMIT)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(
      `Home || fetching figurines for the home dish || ${message} || 🦉`,
    )
    figurines = []
  }

  return <HomePetriDish figurines={figurines} />
}
