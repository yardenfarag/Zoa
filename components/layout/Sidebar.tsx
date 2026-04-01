"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import {
  Bug,
  Worm,
  Leaf,
  Droplets,
  ShieldAlert,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { label: "Bacteria", href: "/bacteria", icon: Bug },
  { label: "Parasites", href: "/parasites", icon: Worm },
  { label: "Fungus", href: "/fungus", icon: Leaf },
  { label: "Amoebas", href: "/amoebas", icon: Droplets },
  { label: "Viruses", href: "/viruses", icon: ShieldAlert },
] as const

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed left-0 top-14 bottom-0 z-40 flex flex-col border-r border-sidebar-border bg-sidebar"
    >
      <nav className="flex-1 space-y-1 px-2 py-4">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "border-l-2 border-gold bg-scarlet text-white"
                  : "text-parchment/70 hover:bg-white/5 hover:text-parchment",
              )}
            >
              <Icon className="size-5 shrink-0" />
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {label}
                </motion.span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-sidebar-border p-2">
        <button
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
    </motion.aside>
  )
}
