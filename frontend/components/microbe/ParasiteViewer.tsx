"use client"

import { useMemo, useRef, useState } from "react"
import { Canvas } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import type { Group } from "three"
import type { BacteriumPart, BacteriumRenderSpec, BodySegment } from "@/lib/render-spec"
import { getToonGradient } from "./toon-materials"
import { fitParasiteCameraZ, useBodyWobble } from "./motion-hooks"

const TOON_GRADIENT = getToonGradient()

const SELECTED_COLOR = "#eeba30"

const SEGMENT_FILL: Record<string, string> = {
  erythrocyte_shell: "#b01828",
  parasite_cytoplasm_ring: "#8840b0",
  digestive_vacuole: "#6898c8",
  nucleus: "#382060",
}

/**
 * Returns a saturated fill colour per segment id or a neutral default.
 * @param id - Body segment id from the render spec
 */
function segmentFill(id: string): string {
  const c = SEGMENT_FILL[id]
  return c ?? "#6a6060"
}

/**
 * Renders one parasite / host body_segments entry (sphere or thin torus).
 * @param props - Segment geometry, selection state, and click routing
 */
function ParasiteSegmentMesh({
  segment,
  selected,
  onSelect,
  isHostShell,
}: {
  segment: BodySegment
  selected: string | null
  onSelect: (id: string) => void
  isHostShell: boolean
}) {
  const sid = segment.id
  const cx = segment.x_offset_um ?? 0
  const cy = segment.z_offset_um
  const baseFill = segmentFill(sid)
  const color = selected === sid ? SELECTED_COLOR : baseFill

  if (segment.geometry === "sphere") {
    const radius = segment.radius_um
    if (isHostShell) {
      return (
        <mesh
          renderOrder={1}
          position={[cx, cy, 0]}
          onClick={(e) => {
            e.stopPropagation()
            onSelect(sid)
          }}
        >
          <sphereGeometry args={[radius, 40, 40]} />
          <meshStandardMaterial
            color={color}
            transparent
            opacity={0.26}
            depthWrite={false}
            roughness={0.65}
          />
        </mesh>
      )
    }
    return (
      <mesh
        renderOrder={2}
        position={[cx, cy, 0]}
        onClick={(e) => {
          e.stopPropagation()
          onSelect(sid)
        }}
      >
        <sphereGeometry args={[radius, 28, 28]} />
        <meshToonMaterial color={color} gradientMap={TOON_GRADIENT} />
      </mesh>
    )
  }

  if (segment.geometry === "thin_torus") {
    const major = segment.radius_um
    const tube = segment.height_um
    return (
      <group position={[cx, cy, 0]} rotation={[Math.PI / 2 + 0.06, 0.22, 0.35]}>
        <mesh
          renderOrder={2}
          onClick={(e) => {
            e.stopPropagation()
            onSelect(sid)
          }}
        >
          <torusGeometry args={[major, tube, 48, 96]} />
          <meshToonMaterial color={color} gradientMap={TOON_GRADIENT} />
        </mesh>
      </group>
    )
  }

  return null
}

/**
 * Plasmodium blood-stage scene: opaque parasite meshes first, translucent RBC shell last.
 * @param props - Spec, selection, pause, and click handler
 */
export function ParasiteScene({
  spec,
  selected,
  onSelect,
  paused,
}: {
  spec: BacteriumRenderSpec
  selected: string | null
  onSelect: (id: string) => void
  paused: boolean
}) {
  const groupRef = useRef<Group | null>(null)
  useBodyWobble(groupRef, paused, 0.55)

  if (!spec.body || !spec.body.segments) return null

  const segments = spec.body.segments
  const shells: BodySegment[] = []
  const opaqueParasite: BodySegment[] = []

  for (let i = 0; i < segments.length; i++) {
    const s = segments[i]
    if (s.id === "erythrocyte_shell") shells.push(s)
    else opaqueParasite.push(s)
  }

  return (
    <group ref={groupRef}>
      {opaqueParasite.map((seg) => (
        <ParasiteSegmentMesh
          key={seg.id}
          segment={seg}
          selected={selected}
          onSelect={onSelect}
          isHostShell={false}
        />
      ))}
      {shells.map((seg) => (
        <ParasiteSegmentMesh
          key={seg.id}
          segment={seg}
          selected={selected}
          onSelect={onSelect}
          isHostShell={true}
        />
      ))}
    </group>
  )
}

/**
 * Side panel describing the clicked parasite segment.
 * @param part - Selected anatomy part or null
 */
function ParasitePartPanel({ part }: { part: BacteriumPart | null }) {
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

      {hint && (hint.diameter_nm !== null || hint.length_um !== null) ? (
        <div className="space-y-1.5 rounded-lg border border-gold/10 bg-white/[0.03] px-3 py-3">
          <p className="mb-2 text-xs uppercase tracking-widest text-gold/40">Dimensions</p>
          {hint.diameter_nm !== null ? (
            <div className="flex justify-between text-xs">
              <span className="text-parchment/50">Diameter</span>
              <span className="text-parchment/80">{hint.diameter_nm} nm</span>
            </div>
          ) : null}
          {hint.length_um !== null ? (
            <div className="flex justify-between text-xs">
              <span className="text-parchment/50">Length</span>
              <span className="text-parchment/80">{hint.length_um} µm</span>
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

interface ParasiteViewerProps {
  spec: BacteriumRenderSpec
}

/**
 * Procedural 3D figurine for Plasmodium blood-stage parasites inside a stylized erythrocyte.
 * Same canvas affordances as BacteriaViewer / VirusViewer (orbit, pause, pick).
 *
 * @param spec - Render spec from GET /microbes/:id/render-spec
 */
export default function ParasiteViewer({ spec }: ParasiteViewerProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [paused, setPaused] = useState(false)
  const cameraZ = useMemo(() => fitParasiteCameraZ(spec, 45), [spec])

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

  if (spec.body.template !== "plasmodium_blood_stage") {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-xl border border-gold/15 bg-black/30">
        <p className="text-sm text-parchment/40">
          Parasite viewer template not supported: {spec.body.template}
        </p>
      </div>
    )
  }

  const selectedPart = selected
    ? (spec.parts.find((p) => p.id === selected) ?? null)
    : null

  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <div className="relative h-[420px] flex-1 overflow-hidden rounded-xl border border-gold/15 bg-black/40">
        <Canvas
          camera={{ position: [0, 0, cameraZ], fov: 45 }}
          dpr={[1, 2]}
          onPointerMissed={() => setSelected(null)}
        >
          <ambientLight intensity={0.68} />
          <directionalLight position={[4, 6, 5]} intensity={1.35} />
          <directionalLight position={[-4, -3, -4]} intensity={0.28} />

          <ParasiteScene
            spec={spec}
            selected={selected}
            onSelect={setSelected}
            paused={paused}
          />

          <OrbitControls enablePan={false} minDistance={5} maxDistance={28} autoRotate={false} />
        </Canvas>

        <button
          onClick={() => setPaused((prev) => !prev)}
          type="button"
          className="absolute right-3 top-3 flex items-center gap-1.5 rounded-lg border border-gold/20 bg-black/50 px-2.5 py-1.5 text-xs text-parchment/60 backdrop-blur-sm transition-colors hover:border-gold/40 hover:text-parchment/90"
          title={paused ? "Resume micro-motion" : "Pause micro-motion"}
        >
          {paused ? (
            <>
              <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor">
                <polygon points="2,1 11,6 2,11" />
              </svg>
              Move
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
        <ParasitePartPanel part={selectedPart} />
      </div>
    </div>
  )
}
