"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import {
  CatmullRomCurve3,
  QuadraticBezierCurve3,
  TubeGeometry,
  Vector3,
} from "three"
import type { Group, Mesh } from "three"
import type { AppendageHint, BacteriumBody, BacteriumRenderSpec, BacteriumPart } from "@/lib/render-spec"
import { getToonGradient } from "./toon-materials"
import {
  advanceRunTumble,
  createRunTumbleState,
  fitBacteriumCameraZ,
  seededUnit,
  stringSeed,
  useBodyWobble,
  type BacteriaMotilityMode,
} from "./motion-hooks"

// Module-level toon gradient shared by all material instances in this file.
const TOON_GRADIENT = getToonGradient()

// ── Color palette ──────────────────────────────────────────────────────────
//
// Vivid, saturated hues that read clearly under toon (cel-shade) lighting.
// Gram-positive → warm amber/gold.  Gram-negative → vivid seafoam green.
// These are inspired by staining conventions but boosted for a stylised look.

const GRAM_BODY_COLOR: Record<string, string> = {
  positive: "#e07820",
  negative: "#28b878",
  variable: "#d03828",
}

const GRAM_SHELL_COLOR: Record<string, string> = {
  positive: "#f0d040",
  negative: "#58e8a8",
  variable: "#f05040",
}

const SELECTED_COLOR = "#eeba30"

/** Shell radial offsets in Three.js units (1 unit = 1 µm). */
const SHELL_OFFSET: Record<string, number> = {
  outer_membrane: 0.08,
  capsule: 0.18,
}

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Looks up the body color for a given gram status key.
 * @param gramStatus - gram_status string from the render spec, or null
 * @returns Hex color string
 */
function bodyColor(gramStatus: string | null): string {
  return GRAM_BODY_COLOR[gramStatus ?? "variable"] ?? GRAM_BODY_COLOR["variable"]!
}

/**
 * Looks up the shell color for a given gram status key.
 * @param gramStatus - gram_status string from the render spec, or null
 * @returns Hex color string
 */
function shellColor(gramStatus: string | null): string {
  return GRAM_SHELL_COLOR[gramStatus ?? "variable"] ?? GRAM_SHELL_COLOR["variable"]!
}

// ── Body geometries ────────────────────────────────────────────────────────

/**
 * Capsule-shaped rod body with toon (cel) shading; outline meshes removed for
 * a cleaner stylised look (still saturated gram-inspired palette).
 * @param lengthUm - Total cell length in µm
 * @param widthUm - Cell width in µm; radius = widthUm / 2
 * @param color - Hex color string
 * @param onClick - Selection handler
 */
function RodBody({
  lengthUm,
  widthUm,
  color,
  onClick,
}: {
  lengthUm: number
  widthUm: number
  color: string
  onClick: () => void
}) {
  const radius = widthUm / 2
  const capsLength = Math.max(0.01, lengthUm - widthUm)

  return (
    <group
      rotation={[Math.PI / 2, 0, 0]}
      onClick={(e) => { e.stopPropagation(); onClick() }}
    >
      <mesh>
        <capsuleGeometry args={[radius, capsLength, 8, 24]} />
        <meshToonMaterial color={color} gradientMap={TOON_GRADIENT} />
      </mesh>
    </group>
  )
}

/**
 * Spherical coccus body with toon shading.
 * @param widthUm - Cell diameter in µm; radius = widthUm / 2
 * @param color - Hex color string
 * @param onClick - Selection handler
 */
function CoccusBody({
  widthUm,
  color,
  onClick,
}: {
  widthUm: number
  color: string
  onClick: () => void
}) {
  const radius = widthUm / 2

  return (
    <group onClick={(e) => { e.stopPropagation(); onClick() }}>
      <mesh>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshToonMaterial color={color} gradientMap={TOON_GRADIENT} />
      </mesh>
    </group>
  )
}

/**
 * Comma-shaped curved rod with toon shading and sphere end caps.
 * @param lengthUm - Cell length in µm (arc length approximation)
 * @param widthUm - Cell width in µm; tube radius = widthUm / 2
 * @param color - Hex color string
 * @param onClick - Selection handler
 */
function CurvedRodBody({
  lengthUm,
  widthUm,
  color,
  onClick,
}: {
  lengthUm: number
  widthUm: number
  color: string
  onClick: () => void
}) {
  const halfLen = lengthUm / 2
  const bend = lengthUm * 0.3
  const curve = new QuadraticBezierCurve3(
    new Vector3(-halfLen, 0, 0),
    new Vector3(0, bend, 0),
    new Vector3(halfLen, 0, 0),
  )
  const radius = widthUm / 2

  return (
    <group onClick={(e) => { e.stopPropagation(); onClick() }}>
      <mesh>
        <tubeGeometry args={[curve, 24, radius, 12, false]} />
        <meshToonMaterial color={color} gradientMap={TOON_GRADIENT} />
      </mesh>
      {/* Rounded end caps */}
      <mesh position={[-halfLen, 0, 0]}>
        <sphereGeometry args={[radius, 16, 16]} />
        <meshToonMaterial color={color} gradientMap={TOON_GRADIENT} />
      </mesh>
      <mesh position={[halfLen, 0, 0]}>
        <sphereGeometry args={[radius, 16, 16]} />
        <meshToonMaterial color={color} gradientMap={TOON_GRADIENT} />
      </mesh>
    </group>
  )
}

// ── Shell overlays ─────────────────────────────────────────────────────────

/**
 * Transparent shell overlay representing outer_membrane or capsule.
 * Uses meshStandardMaterial (transparent) since toon shading doesn't
 * composite correctly at low opacity.
 *
 * @param template - Body template to match geometry
 * @param lengthUm - Body length in µm
 * @param widthUm - Body width in µm
 * @param partId - normalized_name ("outer_membrane" | "capsule")
 * @param color - Hex color string
 * @param opacity - Transparency (0–1)
 * @param renderOrder - Prevents z-fighting with body
 * @param onClick - Selection handler
 */
function ShellOverlay({
  template,
  lengthUm,
  widthUm,
  partId,
  color,
  opacity,
  renderOrder,
  onClick,
}: {
  template: string
  lengthUm: number
  widthUm: number
  partId: string
  color: string
  opacity: number
  renderOrder: number
  onClick: () => void
}) {
  const offset = SHELL_OFFSET[partId] ?? 0.1
  const shellRadius = widthUm / 2 + offset

  if (template === "curved_rod") {
    const halfLen = lengthUm / 2
    const bend = lengthUm * 0.3
    const curve = new QuadraticBezierCurve3(
      new Vector3(-halfLen, 0, 0),
      new Vector3(0, bend, 0),
      new Vector3(halfLen, 0, 0),
    )
    return (
      <group
        renderOrder={renderOrder}
        onClick={(e) => { e.stopPropagation(); onClick() }}
      >
        <mesh>
          <tubeGeometry args={[curve, 24, shellRadius, 12, false]} />
          <meshStandardMaterial color={color} transparent opacity={opacity} depthWrite={false} roughness={0.6} />
        </mesh>
        <mesh position={[-halfLen, 0, 0]}>
          <sphereGeometry args={[shellRadius, 14, 14]} />
          <meshStandardMaterial color={color} transparent opacity={opacity} depthWrite={false} roughness={0.6} />
        </mesh>
        <mesh position={[halfLen, 0, 0]}>
          <sphereGeometry args={[shellRadius, 14, 14]} />
          <meshStandardMaterial color={color} transparent opacity={opacity} depthWrite={false} roughness={0.6} />
        </mesh>
      </group>
    )
  }

  if (template === "coccus") {
    return (
      <mesh
        renderOrder={renderOrder}
        onClick={(e) => { e.stopPropagation(); onClick() }}
      >
        <sphereGeometry args={[shellRadius, 32, 32]} />
        <meshStandardMaterial color={color} transparent opacity={opacity} depthWrite={false} roughness={0.6} />
      </mesh>
    )
  }

  const capsLength = Math.max(0.01, lengthUm - widthUm)
  return (
    <mesh
      rotation={[Math.PI / 2, 0, 0]}
      renderOrder={renderOrder}
      onClick={(e) => { e.stopPropagation(); onClick() }}
    >
      <capsuleGeometry args={[shellRadius, capsLength, 8, 24]} />
      <meshStandardMaterial color={color} transparent opacity={opacity} depthWrite={false} roughness={0.6} />
    </mesh>
  )
}

// ── Appendages ─────────────────────────────────────────────────────────────

/**
 * Control points for peritrichous filaments in the bundled (run) posture:
 * tight rear-posterior cluster, +Z bundle.
 * @param body - Rod body parameters
 * @param hint - Flagellum hint from the render spec
 * @param seed - Numeric seed for phase jitter
 * @returns One polyline per filament (world µm)
 */
function buildPeritrichousSwimPoints(
  body: BacteriumBody,
  hint: AppendageHint,
  seed: number,
): Vector3[][] {
  const count = hint.count
  const flagLen = hint.length_um ?? body.length_um + body.width_um * 1.2
  const amplitude = (hint.amplitude_um ?? body.width_um * 0.28) * 0.45
  const wavelength = hint.wavelength_um ?? flagLen / 2.5
  const cycles = flagLen / wavelength
  const zFactor = hint.waveform_type === "helical" ? 1.0 : 0.12
  const rearZ = body.length_um / 2
  const clusterR = body.width_um * 0.2
  const numPts = Math.max(12, Math.round(cycles * 7))
  const result: Vector3[][] = []
  for (let i = 0; i < count; i++) {
    const phi = (i / count) * Math.PI * 2
    const startX = Math.cos(phi) * clusterR
    const startY = Math.sin(phi) * clusterR
    const phaseShift = seededUnit(seed, i + 40) * Math.PI * 0.4
    const row: Vector3[] = []
    for (let j = 0; j <= numPts; j++) {
      const t = j / numPts
      const angle = t * Math.PI * 2 * cycles + phaseShift
      const waveX = Math.sin(angle) * amplitude
      const waveY = Math.cos(angle) * amplitude * zFactor
      row.push(
        new Vector3(
          startX + waveX,
          startY + waveY,
          rearZ + t * flagLen,
        ),
      )
    }
    result.push(row)
  }
  return result
}

/**
 * Control points for peritrichous filaments in the dispersed (tumble) posture:
 * anchors on the lateral surface, trails biased toward +Z so filaments stay
 * in view (no radial "spokes").
 * @param body - Rod body parameters
 * @param hint - Flagellum hint
 * @param seed - Numeric seed
 * @returns One polyline per filament (same point counts as swim builder)
 */
function buildPeritrichousTumblePoints(
  body: BacteriumBody,
  hint: AppendageHint,
  seed: number,
): Vector3[][] {
  const count = hint.count
  const bodyRadius = body.width_um / 2
  const capsLen = Math.max(0.01, body.length_um - body.width_um)
  const rawLen = hint.length_um ?? body.length_um + body.width_um * 1.1
  const flagLen = Math.min(rawLen, body.length_um * 1.05 + body.width_um * 1.2)
  const amplitude = (hint.amplitude_um ?? body.width_um * 0.26) * 0.82
  const wavelength = hint.wavelength_um ?? flagLen / 2.5
  const cycles = flagLen / wavelength
  const zFactor = hint.waveform_type === "helical" ? 1.0 : 0.12
  const swimRef = buildPeritrichousSwimPoints(body, hint, seed)
  const numPts = swimRef[0] ? swimRef[0].length - 1 : 12
  const result: Vector3[][] = []
  const worldUp = new Vector3(0, 1, 0)
  for (let i = 0; i < count; i++) {
    const phi = (i / count) * Math.PI * 2
    const zPos = ((i / count) - 0.5) * capsLen * 0.85
    const startX = Math.cos(phi) * bodyRadius * 0.98
    const startY = Math.sin(phi) * bodyRadius * 0.98
    const start = new Vector3(startX, startY, zPos)
    const spreadX = (seededUnit(seed, i + 10) - 0.5) * 0.55
    const spreadY = (seededUnit(seed, i + 11) - 0.5) * 0.45
    const dir = new Vector3(spreadX * 0.35, spreadY * 0.3, 1).normalize()
    let perp = new Vector3().crossVectors(dir, worldUp)
    if (perp.length() < 0.001) {
      perp = new Vector3().crossVectors(dir, new Vector3(1, 0, 0))
    }
    perp.normalize()
    const perp2 = new Vector3().crossVectors(perp, dir).normalize()
    const phaseShift = seededUnit(seed, i + 20) * Math.PI * 0.75
    const row: Vector3[] = []
    for (let j = 0; j <= numPts; j++) {
      const t = j / numPts
      const base = start.clone().addScaledVector(dir, t * flagLen)
      const angle = t * Math.PI * 2 * cycles + phaseShift
      const wave = Math.sin(angle) * amplitude
      const zWavePart = Math.cos(angle) * amplitude * zFactor
      base.addScaledVector(perp, wave)
      base.addScaledVector(perp2, zWavePart * 0.38)
      row.push(base)
    }
    result.push(row)
  }
  return result
}

/**
 * Polar filament with long-axis spin and shared run/tumble timing (n=1).
 */
function PolarFlagellum({
  body,
  hint,
  color,
  selected,
  onClick,
  bacteriaState,
  seedKey,
}: {
  body: BacteriumBody
  hint: AppendageHint
  color: string
  selected: boolean
  onClick: () => void
  bacteriaState: BacteriaMotilityMode
  seedKey: string
}) {
  const seed = useMemo(() => stringSeed(seedKey), [seedKey])
  const machineRef = useRef(createRunTumbleState(1, bacteriaState, seed))
  const spinRef = useRef<Group | null>(null)

  useEffect(() => {
    machineRef.current = createRunTumbleState(1, bacteriaState, seed)
  }, [bacteriaState, seed])

  const halfLen = body.length_um / 2
  const flagLen = hint.length_um ?? body.length_um * 2.5
  const tubeRadius =
    hint.diameter_nm !== null
      ? hint.diameter_nm / 1000 / 2
      : Math.max(0.018, body.width_um * 0.05)
  const amplitude = hint.amplitude_um ?? body.width_um * 0.35
  const wavelength = hint.wavelength_um ?? flagLen / 2.5
  const cycles = flagLen / wavelength
  const zFactor = hint.waveform_type === "helical" ? 1.0 : 0.12

  const curve = useMemo(() => {
    const numPts = Math.max(12, Math.round(cycles * 8))
    const pts: Vector3[] = []
    for (let i = 0; i <= numPts; i++) {
      const t = i / numPts
      const angle = t * Math.PI * 2 * cycles
      pts.push(
        new Vector3(
          halfLen + t * flagLen,
          Math.sin(angle) * amplitude,
          Math.cos(angle) * amplitude * zFactor,
        ),
      )
    }
    return new CatmullRomCurve3(pts)
  }, [halfLen, flagLen, amplitude, cycles, zFactor])

  const tubularSegs = Math.max(24, Math.round(cycles * 10))

  useFrame((_, dt) => {
    advanceRunTumble(machineRef.current, dt, bacteriaState, seed, 1)
    const g = spinRef.current
    if (g) {
      g.rotation.x += machineRef.current.rotations[0] * dt
    }
  })

  return (
    <group ref={spinRef}>
      <mesh
        renderOrder={2}
        onClick={(e) => {
          e.stopPropagation()
          onClick()
        }}
      >
        <tubeGeometry args={[curve, tubularSegs, tubeRadius, 8, false]} />
        <meshToonMaterial
          color={selected ? SELECTED_COLOR : color}
          gradientMap={TOON_GRADIENT}
        />
      </mesh>
    </group>
  )
}

/**
 * Peritrichous bundle with lerped tumble↔swim shapes and per-filament
 * helical-axis spin (single WebGL-friendly `useFrame`).
 */
function PeritrichousFlagellaBundle({
  body,
  hint,
  color,
  selected,
  onClick,
  bacteriaState,
  seedKey,
}: {
  body: BacteriumBody
  hint: AppendageHint
  color: string
  selected: boolean
  onClick: () => void
  bacteriaState: BacteriaMotilityMode
  seedKey: string
}) {
  const seed = useMemo(() => stringSeed(seedKey), [seedKey])
  const n = hint.count
  const machineRef = useRef(createRunTumbleState(n, bacteriaState, seed))

  useEffect(() => {
    machineRef.current = createRunTumbleState(n, bacteriaState, seed)
  }, [bacteriaState, seed, n])

  const swimPts = useMemo(
    () => buildPeritrichousSwimPoints(body, hint, seed),
    [body, hint, seed],
  )
  const tumblePts = useMemo(
    () => buildPeritrichousTumblePoints(body, hint, seed),
    [body, hint, seed],
  )

  const flagLen = hint.length_um ?? body.length_um + body.width_um * 1.2
  const wavelength = hint.wavelength_um ?? flagLen / 2.5
  const cycles = flagLen / wavelength
  const tubeRadius =
    hint.diameter_nm !== null
      ? hint.diameter_nm / 1000 / 2
      : Math.max(0.016, body.width_um * 0.04)
  const tubularSegs = Math.max(16, Math.round(cycles * 8))

  const spinRefs = useRef<Array<Group | null>>([])
  const meshRefs = useRef<Array<Mesh | null>>([])
  const scratchRef = useRef<Vector3[]>([])

  const initialCurves = useMemo(() => {
    return swimPts.map((pts) => new CatmullRomCurve3(pts))
  }, [swimPts])

  useFrame((_, dt) => {
    if (swimPts.length === 0 || tumblePts.length === 0) return
    advanceRunTumble(machineRef.current, dt, bacteriaState, seed, n)
    const tt = machineRef.current.transitionT
    const machine = machineRef.current
    const segCount = swimPts[0].length
    if (scratchRef.current.length !== segCount) {
      scratchRef.current = []
      for (let s = 0; s < segCount; s++) {
        scratchRef.current.push(new Vector3())
      }
    }
    const scratch = scratchRef.current
    for (let i = 0; i < n; i++) {
      const a = tumblePts[i]
      const b = swimPts[i]
      for (let j = 0; j < segCount; j++) {
        scratch[j].copy(a[j]).lerp(b[j], tt)
      }
      const curve = new CatmullRomCurve3(scratch)
      const mesh = meshRefs.current[i]
      if (mesh) {
        mesh.geometry.dispose()
        mesh.geometry = new TubeGeometry(
          curve,
          tubularSegs,
          tubeRadius,
          8,
          false,
        )
      }
      const grp = spinRefs.current[i]
      if (grp) {
        grp.rotation.x += machine.rotations[i] * dt
      }
    }
  })

  return (
    <group>
      {initialCurves.map((curve, i) => (
        <group
          key={i}
          ref={(el) => {
            spinRefs.current[i] = el
          }}
        >
          <mesh
            ref={(el) => {
              meshRefs.current[i] = el
            }}
            renderOrder={2}
            onClick={(e) => {
              e.stopPropagation()
              onClick()
            }}
          >
            <tubeGeometry args={[curve, tubularSegs, tubeRadius, 8, false]} />
            <meshToonMaterial
              color={selected ? SELECTED_COLOR : color}
              gradientMap={TOON_GRADIENT}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// ── Bacteria activity states ────────────────────────────────────────────────

export type BacteriaState = BacteriaMotilityMode

const BACTERIA_STATES: Record<
  BacteriaState,
  { label: string; description: string }
> = {
  auto: {
    label: "Auto",
    description:
      "Autonomous runs and short tumbles ― each cell alternates bundled swimming with brief dispersal, similar in spirit to real run-and-tumble chemotaxis.",
  },
  tumbling: {
    label: "Tumbling",
    description:
      "Forced dispersal: flagella detached from the posterior bundle with mixed rotation (one filament reverses).",
  },
  swimming: {
    label: "Swimming",
    description:
      "Forced run: all filaments in a tight rear bundle with CCW-like screw rotation along each stalk.",
  },
}

/**
 * Tab bar for Auto / Tumble / Swim. Only shown when peritrichous flagella exist.
 * @param current - Active mode
 * @param onSelect - Tab click handler
 */
function BacteriaStateBar({
  current,
  onSelect,
}: {
  current: BacteriaState
  onSelect: (s: BacteriaState) => void
}) {
  const keys: BacteriaState[] = ["auto", "tumbling", "swimming"]
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 shrink-0 text-xs uppercase tracking-widest text-parchment/30">
        State
      </span>
      <div className="flex flex-wrap gap-1.5">
        {keys.map((key) => {
          const cfg = BACTERIA_STATES[key]
          const isActive = key === current
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              className={[
                "rounded-full border px-3 py-1 text-xs transition-colors",
                isActive
                  ? "border-gold/60 bg-gold/15 text-gold"
                  : "border-white/10 bg-white/5 text-parchment/50 hover:border-white/25 hover:text-parchment/80",
              ].join(" ")}
              title={cfg.description}
            >
              {cfg.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Scene ──────────────────────────────────────────────────────────────────

/**
 * Three.js scene: dispatches body geometry by template, renders optional shell,
 * and renders appendages (flagella, fimbriae, pili) from the parts list.
 * Must be a child of <Canvas> so useFrame is valid.
 */
export function BacteriumScene({
  spec,
  selected,
  onSelect,
  paused,
  bacteriaState,
}: {
  spec: BacteriumRenderSpec
  selected: string | null
  onSelect: (id: string) => void
  paused: boolean
  bacteriaState: BacteriaState
}) {
  const groupRef = useRef<Group | null>(null)
  useBodyWobble(groupRef, paused, 1)

  if (!spec.body) return null

  const template = spec.body.template
  const lengthUm = spec.body.length_um
  const widthUm = spec.body.width_um
  const gramStatus = spec.body.gram_status

  const shellPart: BacteriumPart | undefined = spec.parts.find(
    (p) =>
      (p.id === "outer_membrane" || p.id === "capsule") &&
      p.presence !== "absent",
  )

  const appendageParts: BacteriumPart[] = spec.parts.filter(
    (p) => p.render_hint !== null && p.presence !== "absent",
  )

  const currentBodyColor =
    selected === "body" ? SELECTED_COLOR : bodyColor(gramStatus)
  const currentShellColor =
    shellPart && selected === shellPart.id
      ? SELECTED_COLOR
      : shellColor(gramStatus)

  return (
    <group ref={groupRef}>
      {template === "coccus" ? (
        <CoccusBody
          widthUm={widthUm}
          color={currentBodyColor}
          onClick={() => onSelect("body")}
        />
      ) : template === "curved_rod" ? (
        <CurvedRodBody
          lengthUm={lengthUm}
          widthUm={widthUm}
          color={currentBodyColor}
          onClick={() => onSelect("body")}
        />
      ) : (
        <RodBody
          lengthUm={lengthUm}
          widthUm={widthUm}
          color={currentBodyColor}
          onClick={() => onSelect("body")}
        />
      )}

      {shellPart ? (
        <ShellOverlay
          template={template}
          lengthUm={lengthUm}
          widthUm={widthUm}
          partId={shellPart.id}
          color={currentShellColor}
          opacity={shellPart.presence === "variable" ? 0.15 : 0.25}
          renderOrder={1}
          onClick={() => onSelect(shellPart.id)}
        />
      ) : null}

      {appendageParts.map((part) => {
        const hint = part.render_hint as AppendageHint
        const appendageColor =
          selected === part.id ? SELECTED_COLOR : shellColor(gramStatus)

        if (hint.attachment === "polar") {
          const seedKey = spec.microbe_id + ":" + part.id
          return (
            <PolarFlagellum
              key={part.id}
              body={spec.body!}
              hint={hint}
              color={appendageColor}
              selected={selected === part.id}
              onClick={() => onSelect(part.id)}
              bacteriaState={bacteriaState}
              seedKey={seedKey}
            />
          )
        }

        if (hint.attachment === "peritrichous") {
          const seedKey = spec.microbe_id + ":" + part.id
          return (
            <PeritrichousFlagellaBundle
              key={part.id}
              body={spec.body!}
              hint={hint}
              color={appendageColor}
              selected={selected === part.id}
              onClick={() => onSelect(part.id)}
              bacteriaState={bacteriaState}
              seedKey={seedKey}
            />
          )
        }

        return null
      })}
    </group>
  )
}

// ── Side panel ─────────────────────────────────────────────────────────────

/**
 * Displays label, description, notes, and appendage-specific biological facts
 * for the currently selected part.
 * @param part - The selected BacteriumPart, or null when nothing is selected
 */
function PartPanel({ part }: { part: BacteriumPart | null }) {
  if (!part) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <p className="text-xs uppercase tracking-[0.15em] text-gold/40">
          Interactive
        </p>
        <p className="mt-2 text-sm text-parchment/40">
          Click a region to learn more
        </p>
      </div>
    )
  }

  const hint = part.render_hint

  const rotationLabel =
    hint && hint.rotation_dir === "ccw"
      ? "CCW (swimming)"
      : hint && hint.rotation_dir === "cw"
        ? "CW (swimming)"
        : null

  const handednessLabel =
    hint && hint.handedness ? `${hint.handedness}-handed helix` : null

  const waveformLabel =
    hint && hint.waveform_type === "helical"
      ? "Helical (3D)"
      : hint && hint.waveform_type === "sinusoidal"
        ? "Sinusoidal (planar)"
        : null

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-gold" />
        <h3 className="text-sm font-medium uppercase tracking-[0.12em] text-gold">
          {part.label}
        </h3>
      </div>

      {part.presence !== "present" ? (
        <span className="inline-block rounded-full border border-gold/20 bg-gold/10 px-2 py-0.5 text-xs text-gold/70">
          {part.presence}
        </span>
      ) : null}

      <p className="text-sm leading-relaxed text-parchment/85">
        {part.description}
      </p>

      {hint && (hint.waveform_type || hint.rotation_dir || hint.handedness || hint.wavelength_um || hint.amplitude_um) ? (
        <div className="space-y-1.5 rounded-lg border border-gold/10 bg-white/[0.03] px-3 py-3">
          <p className="mb-2 text-xs uppercase tracking-widest text-gold/40">Motility data</p>
          {waveformLabel ? (
            <div className="flex justify-between text-xs">
              <span className="text-parchment/50">Waveform</span>
              <span className="text-parchment/80">{waveformLabel}</span>
            </div>
          ) : null}
          {hint.wavelength_um ? (
            <div className="flex justify-between text-xs">
              <span className="text-parchment/50">Wavelength</span>
              <span className="text-parchment/80">{hint.wavelength_um} µm</span>
            </div>
          ) : null}
          {hint.amplitude_um ? (
            <div className="flex justify-between text-xs">
              <span className="text-parchment/50">Amplitude</span>
              <span className="text-parchment/80">{hint.amplitude_um} µm</span>
            </div>
          ) : null}
          {handednessLabel ? (
            <div className="flex justify-between text-xs">
              <span className="text-parchment/50">Chirality</span>
              <span className="text-parchment/80">{handednessLabel}</span>
            </div>
          ) : null}
          {rotationLabel ? (
            <div className="flex justify-between text-xs">
              <span className="text-parchment/50">Rotation (swim)</span>
              <span className="text-parchment/80">{rotationLabel}</span>
            </div>
          ) : null}
          {hint.diameter_nm ? (
            <div className="flex justify-between text-xs">
              <span className="text-parchment/50">Diameter</span>
              <span className="text-parchment/80">{hint.diameter_nm} nm</span>
            </div>
          ) : null}
        </div>
      ) : null}

      {part.notes ? (
        <p className="border-l-2 border-gold/20 pl-3 text-xs leading-relaxed text-parchment/50">
          {part.notes}
        </p>
      ) : null}
    </div>
  )
}

// ── Public component ───────────────────────────────────────────────────────

interface BacteriaViewerProps {
  spec: BacteriumRenderSpec
}

/**
 * Procedural 3D viewer for a bacterium. Supports rod, coccus, and curved_rod
 * body templates. Uses toon (cel-shade) shading with vivid colors, subtle body
 * wobble, and motile flagella. Clicking a mesh selects it and shows biological information
 * in a side panel.
 *
 * Must be dynamically imported with ssr: false from a server component.
 * @param spec - Render spec from GET /microbes/:id/render-spec
 */
export default function BacteriaViewer({ spec }: BacteriaViewerProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [paused, setPaused] = useState(false)
  const [bacteriaState, setBacteriaState] = useState<BacteriaState>("auto")

  const cameraZ = useMemo(() => fitBacteriumCameraZ(spec, 45), [spec])

  if (!spec.renderable || !spec.body) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-xl border border-gold/15 bg-black/30">
        <p className="text-sm text-parchment/40">
          3D viewer not available for this specimen
          {spec.reason ? ` (${spec.reason})` : null}.
        </p>
      </div>
    )
  }

  const selectedPart = selected
    ? (spec.parts.find((p) => p.id === selected) ?? null)
    : null

  const hasPeritrichous = spec.parts.some(
    (p) => p.render_hint !== null && (p.render_hint as AppendageHint).attachment === "peritrichous",
  )

  return (
    <div className="flex flex-col gap-3">
      {hasPeritrichous ? (
        <BacteriaStateBar current={bacteriaState} onSelect={setBacteriaState} />
      ) : null}

      {hasPeritrichous ? (
        <p className="text-xs leading-relaxed text-parchment/45">
          {BACTERIA_STATES[bacteriaState].description}
        </p>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative h-[420px] flex-1 overflow-hidden rounded-xl border border-gold/15 bg-black/40">
          <Canvas
            camera={{ position: [0, 0, cameraZ], fov: 45 }}
            dpr={[1, 2]}
            onPointerMissed={() => setSelected(null)}
          >
            <ambientLight intensity={0.7} />
            <directionalLight position={[4, 6, 5]} intensity={1.4} />
            <directionalLight position={[-4, -2, -4]} intensity={0.25} />

            <BacteriumScene
              spec={spec}
              selected={selected}
              onSelect={setSelected}
              paused={paused}
              bacteriaState={bacteriaState}
            />

            <OrbitControls
              enablePan={false}
              minDistance={2}
              maxDistance={12}
              autoRotate={false}
            />
          </Canvas>

          <button
            onClick={() => setPaused((prev) => !prev)}
            className="absolute right-3 top-3 flex items-center gap-1.5 rounded-lg border border-gold/20 bg-black/50 px-2.5 py-1.5 text-xs text-parchment/60 backdrop-blur-sm transition-colors hover:border-gold/40 hover:text-parchment/90"
            title={paused ? "Resume rotation" : "Pause rotation"}
          >
            {paused ? (
              <>
                <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor">
                  <polygon points="2,1 11,6 2,11" />
                </svg>
                Rotate
              </>
            ) : (
              <>
                <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor">
                  <rect x="2" y="1" width="3" height="10" />
                  <rect x="7" y="1" width="3" height="10" />
                </svg>
                Pause
              </>
            )}
          </button>

          <p className="pointer-events-none absolute bottom-3 left-0 right-0 text-center text-xs text-parchment/25">
            Drag to rotate · Scroll to zoom · Click a region
          </p>
        </div>

        <div className="h-[420px] w-full overflow-y-auto rounded-xl border border-gold/15 bg-black/30 px-5 py-5 sm:w-64 sm:flex-none">
          <PartPanel part={selectedPart} />
        </div>
      </div>
    </div>
  )
}
