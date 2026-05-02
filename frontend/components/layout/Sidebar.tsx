"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { House, Worm, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { BacteriaIcon } from "@/components/icons/BacteriaIcon"
import { MushroomIcon } from "@/components/icons/MushroomIcon"
import { AmoebaIcon } from "@/components/icons/AmoebaIcon"
import { VirusIcon } from "@/components/icons/VirusIcon"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { label: "Home", href: "/", icon: House },
  { label: "Bacteria", href: "/bacteria", icon: BacteriaIcon },
  { label: "Parasites", href: "/parasites", icon: Worm },
  { label: "Fungus", href: "/fungus", icon: MushroomIcon },
  { label: "Amoebas", href: "/amoebas", icon: AmoebaIcon },
  { label: "Viruses", href: "/viruses", icon: VirusIcon },
] as const

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        "glass fixed left-0 top-14 bottom-0 z-40 flex flex-col overflow-hidden border-r border-scarlet/25 transition-[width] duration-300 ease-out",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <nav className="flex-1 space-y-1 px-2 py-4">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "border-l-2 border-gold bg-scarlet/50 text-white"
                  : "text-parchment/70 hover:bg-white/5 hover:text-parchment",
              )}
            >
              <Icon className="size-5 shrink-0" />
              {!collapsed ? <span>{label}</span> : null}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-sidebar-border p-2">
        <button
          type="button"
          suppressHydrationWarning
          onClick={onToggle}
          className="flex w-full items-center justify-center rounded-lg p-2 text-parchment/50 transition-colors hover:bg-white/5 hover:text-parchment"
        >
          {collapsed ? (
            <PanelLeftOpen className="size-5" />
          ) : (
            <PanelLeftClose className="size-5" />
          )}
        </button>
      </div>
    </aside>
  )
}
