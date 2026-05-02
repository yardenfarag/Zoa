"use client"

import { Search } from "lucide-react"

export function Topbar() {
  return (
    <header
      className="glass fixed inset-x-0 top-0 z-50 flex h-14 items-center border-b border-scarlet/30 px-4"
      style={{
        boxShadow:
          "0 8px 24px -12px color-mix(in oklab, var(--color-scarlet) 60%, transparent)",
      }}
    >
      <div className="flex w-60 shrink-0 items-center">
        <h1 className="font-heading text-2xl tracking-[0.14em] text-gold">
          ZOA
        </h1>
      </div>

      <div className="mx-auto w-full max-w-md">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gold/50" />
          <input
            type="search"
            name="archive-search"
            autoComplete="off"
            suppressHydrationWarning
            placeholder="Search the archive..."
            className="h-9 w-full rounded-lg border border-gold/20 bg-white/5 pl-9 pr-4 text-sm text-parchment placeholder:text-parchment/40 outline-none transition-colors focus:border-gold/50 focus:ring-1 focus:ring-gold/25"
          />
        </div>
      </div>

      <div className="w-60 shrink-0" />
    </header>
  )
}
