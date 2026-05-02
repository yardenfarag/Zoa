import path from "node:path"
import { fileURLToPath } from "node:url"
import type { NextConfig } from "next"

const frontendRoot = path.dirname(fileURLToPath(import.meta.url))
const monorepoRoot = path.join(frontendRoot, "..")

const nextConfig: NextConfig = {
  // npm workspaces hoist `next` to the repo root; point Turbopack at the monorepo root.
  turbopack: {
    root: monorepoRoot,
  },
}

export default nextConfig
