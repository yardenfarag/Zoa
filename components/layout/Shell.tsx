"use client"

import { useState } from "react"
import { Topbar } from "./Topbar"
import { Sidebar } from "./Sidebar"

export function Shell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <>
      <Topbar />
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <main
        className="pt-14 transition-[margin-left] duration-300 ease-in-out"
        style={{ marginLeft: collapsed ? 64 : 240 }}
      >
        <div className="min-h-[calc(100vh-3.5rem)] p-6">{children}</div>
      </main>
    </>
  )
}
