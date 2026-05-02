/**
 * Shared R3F motion helpers for microbe viewers: Brownian-like body wobble,
 * flagellar long-axis spin, and a run/tumble timing machine. All hooks respect
 * `prefers-reduced-motion: reduce`.
 */

"use client"

import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import type { Group } from "three"
import type { BacteriumRenderSpec } from "@/lib/render-spec"

export type BacteriaMotilityMode = "auto" | "tumbling" | "swimming"

/**
 * Deterministic pseudo-random in [0, 1) from an integer seed and salt.
 * @param seed - Primary seed (e.g. hashed microbe id)
 * @param salt - Per-filament or per-phase salt
 * @returns Fraction in [0, 1)
 */
export function seededUnit(seed: number, salt: number): number {
  const x = Math.sin(seed * 127.1 + salt * 311.7) * 43758.5453123
  return x - Math.floor(x)
}

/**
 * FNV-1a–style hash for stable integer seeds from strings.
 * @param s - Input string (e.g. microbe id + part id)
 * @returns Positive 32-bit integer seed
 */
export function stringSeed(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h) >>> 0
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

/**
 * Internal state for the run/tumble machine (mutated each frame).
 */
export interface RunTumbleMachineState {
  transitionT: number
  rotations: number[]
  phase: "run" | "tumble"
  nextSwitchMs: number
  revFilamentIdx: number
}

/**
 * Allocates initial run/tumble state for `n` filaments.
 * @param n - Filament count
 * @param forced - UI mode
 * @param seed - Numeric seed
 * @returns Mutable state bag
 */
export function createRunTumbleState(
  n: number,
  forced: BacteriaMotilityMode,
  seed: number,
): RunTumbleMachineState {
  const transitionT =
    forced === "swimming" ? 1 : forced === "tumbling" ? 0 : 1
  const now = typeof performance !== "undefined" ? performance.now() : 0
  const rotations: number[] = []
  for (let i = 0; i < n; i++) {
    rotations.push(26 + (seededUnit(seed, i) - 0.5) * 10)
  }
  return {
    transitionT: transitionT,
    rotations: rotations,
    phase: "run",
    nextSwitchMs: now + 800 + seededUnit(seed, 1) * 1200,
    revFilamentIdx:
      n <= 0 ? 0 : Math.floor(seededUnit(seed, 2) * n) % n,
  }
}

/**
 * Advances run/tumble timing, lerps bundle transition, and fills per-filament
 * rotation rates (rad/s around filament long axis).
 * @param s - Mutable machine state
 * @param dt - Frame delta seconds
 * @param forced - User override or auto
 * @param seed - Numeric seed
 * @param n - Filament count
 */
export function advanceRunTumble(
  s: RunTumbleMachineState,
  dt: number,
  forced: BacteriaMotilityMode,
  seed: number,
  n: number,
): void {
  if (n <= 0) return
  if (prefersReducedMotion()) {
    for (let i = 0; i < n; i++) {
      s.rotations[i] = 0
    }
    return
  }

  const now = performance.now()
  let targetT = 1
  if (forced === "tumbling") {
    targetT = 0
  } else if (forced === "swimming") {
    targetT = 1
  } else {
    if (now >= s.nextSwitchMs) {
      if (s.phase === "run") {
        s.phase = "tumble"
        s.nextSwitchMs = now + 120 + seededUnit(seed, 88) * 100
        s.revFilamentIdx =
          Math.floor(seededUnit(seed, Math.floor(now) % 997) * n) % n
      } else {
        s.phase = "run"
        s.nextSwitchMs = now + 900 + seededUnit(seed, 89) * 900
      }
    }
    targetT = s.phase === "run" ? 1 : 0
  }

  const lerpSpd = 2.0
  const diff = targetT - s.transitionT
  s.transitionT += Math.sign(diff) * Math.min(Math.abs(diff), lerpSpd * dt)

  const tt = s.transitionT
  for (let i = 0; i < n; i++) {
    const runSpd = 26 + (seededUnit(seed, i) - 0.5) * 10
    const tumSpd =
      i === s.revFilamentIdx
        ? -20
        : 12 + seededUnit(seed, i + 100) * 5
    s.rotations[i] = tumSpd * (1 - tt) + runSpd * tt
  }
}

/**
 * Subtle Brownian-style position/rotation jitter on the root organism group.
  * @param groupRef - Root group ref
 * @param paused - When true, motion stops
 * @param intensity - Scale factor (1 = default)
 */
export function useBodyWobble(
  groupRef: React.RefObject<Group | null>,
  paused: boolean,
  intensity: number = 1,
): void {
  const tRef = useRef(0)
  const phaseRef = useRef({
    px: Math.random() * Math.PI * 2,
    py: Math.random() * Math.PI * 2,
    pz: Math.random() * Math.PI * 2,
    rx: Math.random() * Math.PI * 2,
    ry: Math.random() * Math.PI * 2,
  })
  useFrame((_, dt) => {
    if (prefersReducedMotion()) return
    if (paused || !groupRef.current) return
    tRef.current += dt
    const t = tRef.current
    const ph = phaseRef.current
    const ax = 0.035 * intensity
    const ar = 0.022 * intensity
    groupRef.current.position.x =
      Math.sin(t * 1.1 + ph.px) * ax +
      Math.sin(t * 2.3 + ph.py) * ax * 0.35
    groupRef.current.position.y =
      Math.cos(t * 0.9 + ph.py) * ax * 0.85
    groupRef.current.position.z =
      Math.sin(t * 1.4 + ph.pz) * ax * 0.55
    groupRef.current.rotation.x = Math.sin(t * 0.7 + ph.rx) * ar
    groupRef.current.rotation.y = Math.sin(t * 0.55 + ph.ry) * ar * 1.2
  })
}

/**
 * Spins a filament group around local X (filament built along +X).
 * @param groupRef - Wrapper group around the tube mesh
 * @param radPerSecRef - Angular speed ref (updated by parent each frame)
 */
export function useFlagellumAxisSpin(
  groupRef: React.RefObject<Group | null>,
  radPerSecRef: React.MutableRefObject<number>,
): void {
  useFrame((_, dt) => {
    if (prefersReducedMotion()) return
    if (!groupRef.current) return
    groupRef.current.rotation.x += radPerSecRef.current * dt
  })
}

/**
 * Camera distance so bacteria + flagella fit in a perspective frustum.
 * @param spec - Bacterium render spec
 * @param fovDeg - Vertical field of view in degrees
 * @returns Camera Z position (camera looks at origin)
 */
export function fitBacteriumCameraZ(
  spec: BacteriumRenderSpec,
  fovDeg: number,
): number {
  if (!spec.body) return 7
  const b = spec.body
  let extent = 0
  if (b.template === "coccus") {
    extent = b.width_um / 2
  } else if (b.template === "curved_rod") {
    extent = Math.max(
      b.length_um / 2 + b.length_um * 0.15,
      b.width_um / 2,
    )
  } else {
    extent = Math.max(b.length_um / 2, b.width_um / 2)
  }
  const parts = spec.parts
  for (let p = 0; p < parts.length; p++) {
    const part = parts[p]
    if (part.presence === "absent" || !part.render_hint) continue
    const h = part.render_hint
    const flen =
      (h.length_um !== null && h.length_um !== undefined
        ? h.length_um
        : b.length_um * 1.35) +
      (h.amplitude_um !== null && h.amplitude_um !== undefined
        ? h.amplitude_um
        : b.width_um * 0.32)
    extent = Math.max(extent, b.length_um / 2 + flen * 0.95)
  }
  const fov = (fovDeg * Math.PI) / 180
  const dist = (extent * 1.42) / Math.tan(fov / 2)
  return Math.min(18, Math.max(4.2, dist))
}

/**
 * Camera distance for Plasmodium blood-stage host + parasite assembly (1 unit = 1 µm).
 * @param spec - Render spec whose body uses plasmodium_blood_stage template
 * @param fovDeg - Vertical field of view in degrees
 * @returns Camera Z
 */
export function fitParasiteCameraZ(
  spec: BacteriumRenderSpec,
  fovDeg: number,
): number {
  if (!spec.body || spec.body.template !== "plasmodium_blood_stage") {
    return 7
  }
  const b = spec.body
  let extent = b.width_um / 2 + 0.4
  const segs = b.segments
  if (segs) {
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i]
      const xo = s.x_offset_um ?? 0
      const yo = s.z_offset_um
      const planar = Math.sqrt(xo * xo + yo * yo)
      if (s.geometry === "sphere") {
        extent = Math.max(extent, planar + s.radius_um)
      }
      if (s.geometry === "thin_torus") {
        extent = Math.max(extent, planar + s.radius_um + s.height_um)
      }
    }
  }
  const fov = (fovDeg * Math.PI) / 180
  const dist = (extent * 1.42) / Math.tan(fov / 2)
  return Math.min(24, Math.max(5, dist))
}

const VIRUS_SCALE = 10

/**
 * Camera distance for virus templates (µm scaled × VIRUS_SCALE).
 * @param spec - Virus render spec
 * @param fovDeg - Vertical field of view in degrees
 * @returns Camera Z
 */
export function fitVirusCameraZ(
  spec: BacteriumRenderSpec,
  fovDeg: number,
): number {
  if (!spec.body) return 7
  const b = spec.body
  let extent = 0.6
  if (b.template === "enveloped_sphere" || b.template === "icosahedral") {
    extent = (b.width_um / 2) * VIRUS_SCALE + 0.55
  } else if (b.template === "complex_phage" && b.segments) {
    const segments = b.segments
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i]
      const zz =
        Math.abs(seg.z_offset_um) * VIRUS_SCALE + seg.height_um * VIRUS_SCALE
      extent = Math.max(extent, zz)
    }
    extent += 0.35
  }
  const fov = (fovDeg * Math.PI) / 180
  const dist = (extent * 1.38) / Math.tan(fov / 2)
  return Math.min(22, Math.max(4, dist))
}
