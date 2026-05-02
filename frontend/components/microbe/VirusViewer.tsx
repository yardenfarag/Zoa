"use client"

import { useMemo, useRef, useState } from "react"
import { Canvas } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import { CatmullRomCurve3, Quaternion, Vector3 } from "three"
import type { Group } from "three"
import type { AppendageHint, BacteriumBody, BacteriumPart, BacteriumRenderSpec, BodySegment } from "@/lib/render-spec"
import { getToonGradient } from "./toon-materials"
import { fitVirusCameraZ, useBodyWobble } from "./motion-hooks"

// Module-level toon gradient shared by all material instances in this file.
const TOON_GRADIENT = getToonGradient()

// ── Scale ──────────────────────────────────────────────────────────────────
//
// Viruses are 50–220 nm (0.05–0.22 µm). Three.js units are µm, so a virus
// would be invisible at natural scale. We multiply all µm values by SCALE so
// a 100 nm virus renders at 1 Three.js unit — the same visual size as bacteria.

const SCALE = 10

// ── Color palette ──────────────────────────────────────────────────────────

const VIRUS_COLORS: Record<string, { body: string; shell: string; spike: string }> = {
  "SARS-CoV-2":        { body: "#c82828", shell: "#e84848", spike: "#f89090" },
  "Influenza A virus": { body: "#1858c0", shell: "#3888e0", spike: "#80c8f8" },
  "HIV":               { body: "#7820c0", shell: "#a048e0", spike: "#d090f8" },
  "Bacteriophage T4":  { body: "#108868", shell: "#20b888", spike: "#60e8b0" },
}

const DEFAULT_VIRUS_COLORS = { body: "#5a4a3a", shell: "#8a6a4a", spike: "#c4a080" }
const SELECTED_COLOR = "#eeba30"

/**
 * Returns the color set for a given virus name.
 * @param name - Virus display name from the render spec
 */
function virusColors(name: string) {
  return VIRUS_COLORS[name] ?? DEFAULT_VIRUS_COLORS
}

// ── Enveloped sphere ───────────────────────────────────────────────────────

/**
 * Distributes N points uniformly on a sphere surface using the Fibonacci
 * (golden angle) algorithm. Applies a seeded pseudo-random angular jitter to
 * each point to break the too-perfect regularity and look more biological.
 * @param n - Number of points
 * @param radius - Sphere radius in Three.js units
 * @param jitter - Fraction of sphere radius to perturb each point angularly (0–1)
 * @returns Array of Vector3 points on the sphere surface
 */
function fibonacciSphere(n: number, radius: number, jitter: number = 0): Vector3[] {
  const pts: Vector3[] = []
  const phi = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2
    const r = Math.sqrt(1 - y * y)
    const theta = phi * i
    const baseX = Math.cos(theta) * r
    const baseZ = Math.sin(theta) * r

    if (jitter > 0) {
      const jx = (Math.sin(i * 127.1 + 1.3) * 43758.5453 % 1 + 1) % 1 - 0.5
      const jy = (Math.sin(i * 311.7 + 2.1) * 43758.5453 % 1 + 1) % 1 - 0.5
      const jz = (Math.sin(i * 74.9 + 3.7) * 43758.5453 % 1 + 1) % 1 - 0.5
      const jittered = new Vector3(baseX + jx * jitter, y + jy * jitter, baseZ + jz * jitter).normalize()
      pts.push(jittered.multiplyScalar(radius))
    } else {
      pts.push(new Vector3(baseX * radius, y * radius, baseZ * radius))
    }
  }
  return pts
}

/**
 * A single surface spike protein (cone shape pointing radially outward).
 * @param position - Base point on sphere surface
 * @param normal - Unit vector pointing away from sphere centre
 * @param spikeLen - Length of the spike in Three.js units
 * @param spikeRadius - Base radius of the spike cone
 * @param color - Hex color
 * @param onClick - Click handler
 */
function SpikeProtein({
  position,
  normal,
  spikeLen,
  spikeRadius,
  color,
  heightVar,
  onClick,
}: {
  position: Vector3
  normal: Vector3
  spikeLen: number
  spikeRadius: number
  color: string
  /** 0.8–1.2 multiplier for organic length variation per spike */
  heightVar: number
  onClick: () => void
}) {
  // Orient the default Y-axis cone along the outward normal
  const quaternion = useMemo(() => {
    const up = new Vector3(0, 1, 0)
    const q = new Quaternion()
    q.setFromUnitVectors(up, normal)
    return q
  }, [normal])

  const effectiveLen = spikeLen * heightVar
  const midPoint = position.clone().addScaledVector(normal, effectiveLen / 2)

  return (
    <mesh
      position={midPoint}
      quaternion={quaternion}
      renderOrder={2}
      onClick={(e) => { e.stopPropagation(); onClick() }}
    >
      {/* Slightly wider at top for a mushroom/club shape */}
      <cylinderGeometry args={[spikeRadius * 1.5, spikeRadius * 0.6, effectiveLen, 6]} />
      <meshToonMaterial color={color} gradientMap={TOON_GRADIENT} />
    </mesh>
  )
}

/**
 * Enveloped spherical virus body with a transparent outer envelope and
 * Fibonacci-distributed surface spike proteins.
 *
 * @param body - Render spec body with template = 'enveloped_sphere'
 * @param parts - Parts list from the render spec
 * @param name - Virus name (used for color selection)
 * @param selected - Currently selected part ID, or null
 * @param onSelect - Selection handler
 */
function EnvelopedSphereBody({
  body,
  parts,
  name,
  selected,
  onSelect,
}: {
  body: BacteriumBody
  parts: BacteriumPart[]
  name: string
  selected: string | null
  onSelect: (id: string) => void
}) {
  const radius = (body.width_um / 2) * SCALE
  const colors = virusColors(name)

  const envelopePart = parts.find((p) => p.id === "envelope" && p.presence !== "absent")
  const surfaceParts = parts.filter(
    (p) => p.render_hint?.attachment === "surface_sphere" && p.presence !== "absent",
  )

  const envelopeColor = selected === "envelope" ? SELECTED_COLOR : colors.shell

  // Pre-compute spike positions for each surface protein type.
  // Jitter of 0.18 breaks the Fibonacci grid pattern to look more biological.
  const spikeData = useMemo(() => {
    return surfaceParts.map((part) => {
      const hint = part.render_hint as AppendageHint
      const count = hint.count
      const spikeLen = (hint.length_um ?? 0.012) * SCALE
      const spikeRadius = hint.diameter_nm !== null
        ? (hint.diameter_nm / 1000 / 2) * SCALE
        : radius * 0.08
      const positions = fibonacciSphere(count, radius, 0.18)
      return { part, hint, spikeLen, spikeRadius, positions }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radius, surfaceParts.length])

  return (
    <group>
      <mesh onClick={(e) => { e.stopPropagation(); onSelect("body") }}>
        <sphereGeometry args={[radius * 0.88, 32, 32]} />
        <meshToonMaterial
          color={selected === "body" ? SELECTED_COLOR : colors.body}
          gradientMap={TOON_GRADIENT}
        />
      </mesh>

      {/* Transparent envelope layer — standard material preserves opacity */}
      {envelopePart ? (
        <mesh
          renderOrder={1}
          onClick={(e) => { e.stopPropagation(); onSelect("envelope") }}
        >
          <sphereGeometry args={[radius, 32, 32]} />
          <meshStandardMaterial
            color={envelopeColor}
            transparent
            opacity={0.22}
            depthWrite={false}
            roughness={0.6}
          />
        </mesh>
      ) : null}

      {/* Surface spike proteins */}
      {spikeData.map(({ part, spikeLen, spikeRadius, positions }) =>
        positions.map((pos, i) => {
          const normal = pos.clone().normalize()
          const spikeColor = selected === part.id ? SELECTED_COLOR : colors.spike
          // Seeded per-spike height variation: 82%–118% of nominal, for organic variety
          const heightVar = 0.82 + ((Math.sin(i * 53.3 + 7.1) * 43758.5453 % 1) + 1) % 1 * 0.36
          return (
            <SpikeProtein
              key={`${part.id}-${i}`}
              position={pos}
              normal={normal}
              spikeLen={spikeLen}
              spikeRadius={spikeRadius}
              color={spikeColor}
              heightVar={heightVar}
              onClick={() => onSelect(part.id)}
            />
          )
        }),
      )}
    </group>
  )
}

// ── T4 activity states ─────────────────────────────────────────────────────

type PhageState = "scanning" | "triggered" | "injecting"

interface PhageStateConfig {
  label: string
  description: string
  sheathHeight: number
  sheathRadius: number
  sheathZOffset: number
  baseplateRadius: number
  baseplateZOffset: number
  /** Horizontal reach of each tail fiber endpoint (multiplied by fiber length). */
  fiberOutward: number
  /** Downward reach of each tail fiber endpoint (multiplied by fiber length). */
  fiberDown: number
}

const PHAGE_STATES: Record<PhageState, PhageStateConfig> = {
  scanning: {
    label: "Scanning",
    description: "Freely diffusing. Tail fibers loosely raised, sensing LPS receptors.",
    sheathHeight: 0.080,
    sheathRadius: 0.0125,
    sheathZOffset: -0.0565,
    baseplateRadius: 0.030,
    baseplateZOffset: -0.104,
    fiberOutward: 0.55,
    fiberDown: 0.85,
  },
  triggered: {
    label: "Host-bound",
    description: "All 6 tail fibers locked onto bacterial LPS. Baseplate expanding, triggering sheath contraction.",
    sheathHeight: 0.080,
    sheathRadius: 0.0125,
    sheathZOffset: -0.0565,
    baseplateRadius: 0.042,
    baseplateZOffset: -0.104,
    fiberOutward: 0.95,
    fiberDown: 0.32,
  },
  injecting: {
    label: "Injecting",
    description: "Sheath contracted to 44% of length. Inner tail tube has punctured the bacterial outer membrane, ejecting DNA.",
    sheathHeight: 0.035,
    sheathRadius: 0.020,
    sheathZOffset: -0.034,
    baseplateRadius: 0.042,
    baseplateZOffset: -0.059,
    fiberOutward: 0.72,
    fiberDown: 1.05,
  },
}

// ── Complex phage ──────────────────────────────────────────────────────────

/**
 * Color map for individual T4 segments.
 * The head is golden, collar/sheath are steel-blue, baseplate warm amber,
 * tail fibers olive — distinct enough to tell apart at a glance.
 */
const PHAGE_SEGMENT_COLORS: Record<string, string> = {
  head:        "#f0c030",
  collar:      "#4880c0",
  tail_sheath: "#1868d8",
  baseplate:   "#e07820",
  tail_fibers: "#50c860",
}

/**
 * Renders one anatomical segment of the bacteriophage based on its geometry type.
 * Accepts optional dimension overrides so activity-state changes take effect
 * without mutating the underlying render spec.
 *
 * @param seg - BodySegment descriptor from the render spec
 * @param selected - Currently selected part ID
 * @param onSelect - Selection handler
 * @param overrideRadius - Optional radius_um override
 * @param overrideHeight - Optional height_um override
 * @param overrideZOffset - Optional z_offset_um override
 * @param fiberOutward - Horizontal reach factor for tail fibers
 * @param fiberDown - Downward reach factor for tail fibers
 */
function PhageSegment({
  seg,
  selected,
  onSelect,
  overrideRadius,
  overrideHeight,
  overrideZOffset,
  fiberOutward = 0.55,
  fiberDown = 0.85,
}: {
  seg: BodySegment
  selected: string | null
  onSelect: (id: string) => void
  overrideRadius?: number
  overrideHeight?: number
  overrideZOffset?: number
  fiberOutward?: number
  fiberDown?: number
}) {
  const r = (overrideRadius ?? seg.radius_um) * SCALE
  const h = (overrideHeight ?? seg.height_um) * SCALE
  const z = (overrideZOffset ?? seg.z_offset_um) * SCALE
  const baseColor = PHAGE_SEGMENT_COLORS[seg.id] ?? "#607060"
  const color = selected === seg.id ? SELECTED_COLOR : baseColor

  if (seg.geometry === "elongated_icosahedron") {
    // Prolate icosahedron: IcosahedronGeometry scaled vertically
    const aspect = seg.height_um / (seg.radius_um * 2)
    return (
      <group
        position={[0, z, 0]}
        scale={[1, aspect, 1]}
        onClick={(e) => { e.stopPropagation(); onSelect(seg.id) }}
      >
        <mesh>
          <icosahedronGeometry args={[r, 1]} />
          <meshToonMaterial color={color} gradientMap={TOON_GRADIENT} />
        </mesh>
      </group>
    )
  }

  if (seg.geometry === "disc") {
    return (
      <group
        position={[0, z, 0]}
        onClick={(e) => { e.stopPropagation(); onSelect(seg.id) }}
      >
        <mesh>
          <cylinderGeometry args={[r, r, h, 6]} />
          <meshToonMaterial color={color} gradientMap={TOON_GRADIENT} />
        </mesh>
      </group>
    )
  }

  if (seg.geometry === "thin_cylinders_6") {
    // Six tail fibers projecting outward+downward from the baseplate corners
    const fiberLen = h
    const fiberRadius = r
    const baseplateR = 0.030 * SCALE
    const fibers = Array.from({ length: 6 }, (_, i) => ({ phi: (i / 6) * Math.PI * 2 }))

    return (
      <group>
        {fibers.map(({ phi }, i) => {
          const startX = Math.cos(phi) * baseplateR
          const startZ = Math.sin(phi) * baseplateR
          const startY = z
          const endX = startX + Math.cos(phi) * fiberLen * fiberOutward
          const endY = z - fiberLen * fiberDown
          const endZ = startZ + Math.sin(phi) * fiberLen * fiberOutward

          const start = new Vector3(startX, startY, startZ)
          const end = new Vector3(endX, endY, endZ)
          const curve = new CatmullRomCurve3([start, end])

          return (
            <mesh
              key={i}
              renderOrder={2}
              onClick={(e) => { e.stopPropagation(); onSelect(seg.id) }}
            >
              <tubeGeometry args={[curve, 4, fiberRadius, 5, false]} />
              <meshToonMaterial color={selected === seg.id ? SELECTED_COLOR : baseColor} gradientMap={TOON_GRADIENT} />
            </mesh>
          )
        })}
      </group>
    )
  }

  // Default: cylinder (collar and tail sheath)
  return (
    <group
      position={[0, z, 0]}
      onClick={(e) => { e.stopPropagation(); onSelect(seg.id) }}
    >
      <mesh>
        <cylinderGeometry args={[r, r, h, 16]} />
        <meshToonMaterial color={color} gradientMap={TOON_GRADIENT} />
      </mesh>
    </group>
  )
}

/**
 * Renders the full multi-segment Bacteriophage T4 structure.
 * Applies activity-state overrides (sheath/baseplate/fiber dims) so the
 * user can switch between Scanning, Host-bound, and Injecting conformations.
 *
 * @param body - Render spec body with template = 'complex_phage' and segments array
 * @param selected - Currently selected part ID
 * @param onSelect - Selection handler
 * @param phageState - Which activity state to render
 */
function ComplexPhageBody({
  body,
  selected,
  onSelect,
  phageState,
}: {
  body: BacteriumBody
  selected: string | null
  onSelect: (id: string) => void
  phageState: PhageState
}) {
  const segments = body.segments ?? []
  const st = PHAGE_STATES[phageState]

  return (
    <group>
      {segments.map((seg) => {
        if (seg.id === "tail_sheath") {
          return (
            <PhageSegment
              key={seg.id}
              seg={seg}
              selected={selected}
              onSelect={onSelect}
              overrideRadius={st.sheathRadius}
              overrideHeight={st.sheathHeight}
              overrideZOffset={st.sheathZOffset}
            />
          )
        }
        if (seg.id === "baseplate") {
          return (
            <PhageSegment
              key={seg.id}
              seg={seg}
              selected={selected}
              onSelect={onSelect}
              overrideRadius={st.baseplateRadius}
              overrideZOffset={st.baseplateZOffset}
            />
          )
        }
        if (seg.id === "tail_fibers") {
          return (
            <PhageSegment
              key={seg.id}
              seg={seg}
              selected={selected}
              onSelect={onSelect}
              overrideZOffset={st.baseplateZOffset}
              fiberOutward={st.fiberOutward}
              fiberDown={st.fiberDown}
            />
          )
        }
        return (
          <PhageSegment
            key={seg.id}
            seg={seg}
            selected={selected}
            onSelect={onSelect}
          />
        )
      })}

      {/* Tail tube only visible in injecting state — the inner tube now protrudes below the baseplate */}
      {phageState === "injecting" ? (
        <mesh position={[0, (st.baseplateZOffset - 0.030) * SCALE, 0]}>
          <cylinderGeometry args={[0.004 * SCALE, 0.004 * SCALE, 0.055 * SCALE, 8]} />
          <meshToonMaterial color="#d0c880" gradientMap={TOON_GRADIENT} />
        </mesh>
      ) : null}
    </group>
  )
}

// ── Scene ──────────────────────────────────────────────────────────────────

/**
 * Three.js scene: dispatches to EnvelopedSphereBody or ComplexPhageBody.
 * Must be a child of <Canvas> so useFrame is valid.
 */
export type VirusPhageState = PhageState

export function VirusScene({
  spec,
  selected,
  onSelect,
  paused,
  phageState,
}: {
  spec: BacteriumRenderSpec
  selected: string | null
  onSelect: (id: string) => void
  paused: boolean
  phageState: PhageState
}) {
  const groupRef = useRef<Group | null>(null)
  useBodyWobble(groupRef, paused, 1)

  if (!spec.body) return null

  const template = spec.body.template

  return (
    <group ref={groupRef}>
      {template === "enveloped_sphere" || template === "icosahedral" ? (
        <EnvelopedSphereBody
          body={spec.body}
          parts={spec.parts}
          name={spec.name}
          selected={selected}
          onSelect={onSelect}
        />
      ) : template === "complex_phage" ? (
        <ComplexPhageBody
          body={spec.body}
          selected={selected}
          onSelect={onSelect}
          phageState={phageState}
        />
      ) : null}
    </group>
  )
}

// ── Side panel ─────────────────────────────────────────────────────────────

/**
 * Displays label, description, notes, and optional motility data for the
 * selected virus part.
 * @param part - The selected BacteriumPart, or null when nothing is selected
 */
function VirusPartPanel({ part }: { part: BacteriumPart | null }) {
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

      {hint && (hint.diameter_nm || hint.length_um) ? (
        <div className="space-y-1.5 rounded-lg border border-gold/10 bg-white/[0.03] px-3 py-3">
          <p className="mb-2 text-xs uppercase tracking-widest text-gold/40">Dimensions</p>
          {hint.diameter_nm ? (
            <div className="flex justify-between text-xs">
              <span className="text-parchment/50">Diameter</span>
              <span className="text-parchment/80">{hint.diameter_nm} nm</span>
            </div>
          ) : null}
          {hint.length_um ? (
            <div className="flex justify-between text-xs">
              <span className="text-parchment/50">Length</span>
              <span className="text-parchment/80">{Math.round(hint.length_um * 1000)} nm</span>
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

// ── Activity state bar ─────────────────────────────────────────────────────

/**
 * Tab bar that lets the user switch between activity states for complex phage.
 * Only rendered when the virus template is 'complex_phage'.
 *
 * @param states - Array of state keys to show
 * @param current - Currently active state key
 * @param onSelect - Called with new state key when a tab is clicked
 */
function ActivityStateBar({
  states,
  current,
  onSelect,
}: {
  states: PhageState[]
  current: PhageState
  onSelect: (s: PhageState) => void
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 shrink-0 text-xs uppercase tracking-widest text-parchment/30">
        State
      </span>
      <div className="flex flex-wrap gap-1.5">
        {states.map((key) => {
          const cfg = PHAGE_STATES[key]
          const isActive = key === current
          return (
            <button
              key={key}
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

// ── Public component ───────────────────────────────────────────────────────

interface VirusViewerProps {
  spec: BacteriumRenderSpec
}

/**
 * Procedural 3D viewer for viruses. Supports enveloped_sphere (SARS-CoV-2,
 * Influenza A, HIV) and complex_phage (Bacteriophage T4) templates.
 * All µm coordinates are scaled ×10 so nanometre-scale virions appear
 * at the same visual size as bacteria.
 *
 * Must be dynamically imported with ssr: false from a server component.
 * @param spec - Render spec from GET /microbes/:id/render-spec
 */
export default function VirusViewer({ spec }: VirusViewerProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [paused, setPaused] = useState(false)
  const [phageState, setPhageState] = useState<PhageState>("scanning")
  const cameraZ = useMemo(() => fitVirusCameraZ(spec, 45), [spec])

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

  // Look up the selected part — for complex_phage the segment IDs are used
  // directly as part IDs via the outer_structures mapping
  const selectedPart = selected
    ? (spec.parts.find((p) => p.id === selected) ?? null)
    : null

  const isPhage = spec.body.template === "complex_phage"

  return (
    <div className="flex flex-col gap-3">
      {/* ── Activity state tabs (phage only) ────────────────────────────── */}
      {isPhage ? (
        <ActivityStateBar
          states={["scanning", "triggered", "injecting"]}
          current={phageState}
          onSelect={setPhageState}
        />
      ) : null}

      {/* ── Active state description (phage only) ───────────────────────── */}
      {isPhage ? (
        <p className="text-xs leading-relaxed text-parchment/45">
          {PHAGE_STATES[phageState].description}
        </p>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row">
        {/* ── Canvas ──────────────────────────────────────────────────────── */}
        <div className="relative h-[420px] flex-1 overflow-hidden rounded-xl border border-gold/15 bg-black/40">
          <Canvas
            camera={{ position: [0, 0, cameraZ], fov: 45 }}
            dpr={[1, 2]}
            onPointerMissed={() => setSelected(null)}
          >
            <ambientLight intensity={0.65} />
            <directionalLight position={[5, 5, 5]} intensity={1.2} />
            <directionalLight position={[-5, -3, -5]} intensity={0.3} />

            <VirusScene
              spec={spec}
              selected={selected}
              onSelect={setSelected}
              paused={paused}
              phageState={phageState}
            />

            <OrbitControls
              enablePan={false}
              minDistance={2}
              maxDistance={14}
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

        {/* ── Side panel ──────────────────────────────────────────────────── */}
        <div className="h-[420px] w-full overflow-y-auto rounded-xl border border-gold/15 bg-black/30 px-5 py-5 sm:w-64 sm:flex-none">
          <VirusPartPanel part={selectedPart} />
        </div>
      </div>
    </div>
  )
}
