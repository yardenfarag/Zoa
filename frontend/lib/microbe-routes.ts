import type { MicrobeTypeApi } from "./api"

export const ARCHIVE_SLUGS = [
  "bacteria",
  "parasites",
  "fungus",
  "amoebas",
  "viruses",
] as const

export type ArchiveSlug = (typeof ARCHIVE_SLUGS)[number]

export function isArchiveSlug(value: string): value is ArchiveSlug {
  return (ARCHIVE_SLUGS as readonly string[]).includes(value)
}

export function slugToApiType(slug: ArchiveSlug): MicrobeTypeApi {
  switch (slug) {
    case "bacteria":
      return "bacteria"
    case "parasites":
      return "parasite"
    case "fungus":
      return "fungus"
    case "amoebas":
      return "amoeba"
    case "viruses":
      return "virus"
  }
}

export function apiTypeToSlug(type: MicrobeTypeApi): ArchiveSlug {
  switch (type) {
    case "bacteria":
      return "bacteria"
    case "parasite":
      return "parasites"
    case "fungus":
      return "fungus"
    case "amoeba":
      return "amoebas"
    case "virus":
      return "viruses"
  }
}

export function archiveTitle(slug: ArchiveSlug): string {
  switch (slug) {
    case "bacteria":
      return "Bacteria"
    case "parasites":
      return "Parasites"
    case "fungus":
      return "Fungus"
    case "amoebas":
      return "Amoebas"
    case "viruses":
      return "Viruses"
  }
}
