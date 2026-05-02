"use client"

import { useCallback, useEffect, useMemo, useRef } from "react"
import Link from "next/link"
import { Canvas } from "@react-three/fiber"
import { PerspectiveCamera, View } from "@react-three/drei"
import { BacteriumScene } from "@/components/microbe/BacteriaViewer"
import { VirusScene } from "@/components/microbe/VirusViewer"
import {
  fitBacteriumCameraZ,
  fitVirusCameraZ,
} from "@/components/microbe/motion-hooks"
import type { HomeFigurine } from "@/lib/api"
import { apiTypeToSlug } from "@/lib/microbe-routes"

interface FigurineStatic {
  id: string
  href: string
  label: string
  figurine: HomeFigurine
  size: number
  spinSpeed: number
}

interface FigurineMotion {
  x: number
  y: number
  rot: number
  heading: number
  speed: number
}

// const LENS_RADIUS = 110
// const SPRING_CONFIG = { damping: 24, stiffness: 220, mass: 0.5 }

const FALLBACK_VIEWPORT_W = 1280
const FALLBACK_VIEWPORT_H = 800
const MIN_SIZE = 96
const MAX_SIZE = 160
const MIN_SPEED = 8
const MAX_SPEED = 26

/**
 * Produces a uniformly-distributed random number in the half-open interval
 * `[min, max)`.
 * @param min - Inclusive lower bound.
 * @param max - Exclusive upper bound.
 * @returns A random number in the range.
 */
function randBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

/**
 * Builds the figurine descriptor list and an aligned mutable motion-state
 * array, both keyed by index, from server-fetched render-specs. Sizes,
 * starting positions, headings and spin speeds are randomised per page load
 * so the scene feels different each visit.
 * @param figurines - Server-fetched bacteria/virus figurines.
 * @returns Static descriptors and aligned mutable motion state.
 */
function buildFigurineState(figurines: HomeFigurine[]): {
  statics: FigurineStatic[]
  motion: FigurineMotion[]
} {
  const safe = Array.isArray(figurines) ? figurines : []
  const viewportW =
    typeof window === "undefined" ? FALLBACK_VIEWPORT_W : window.innerWidth
  const viewportH =
    typeof window === "undefined" ? FALLBACK_VIEWPORT_H : window.innerHeight

  const statics: FigurineStatic[] = []
  const motionState: FigurineMotion[] = []

  for (let i = 0; i < safe.length; i++) {
    const f = safe[i]
    const size = randBetween(MIN_SIZE, MAX_SIZE)
    const startX = randBetween(0, Math.max(1, viewportW - size))
    const startY = randBetween(0, Math.max(1, viewportH - size))
    statics.push({
      id: f.microbe.id,
      href: `/${apiTypeToSlug(f.microbe.type)}/${f.microbe.id}`,
      label: f.microbe.name,
      figurine: f,
      size: size,
      spinSpeed: randBetween(-25, 25),
    })
    motionState.push({
      x: startX,
      y: startY,
      rot: randBetween(0, 360),
      heading: randBetween(0, Math.PI * 2),
      speed: randBetween(MIN_SPEED, MAX_SPEED),
    })
  }

  return { statics: statics, motion: motionState }
}

/**
 * Builds a `radial-gradient` value that fades the given theme color from a
 * starting opacity to fully transparent. Uses `color-mix` so the visible
 * tint always stays on-palette with the rest of the app.
 * @param colorVar - CSS custom property name, e.g. `--color-scarlet`.
 * @param startPercent - Mixed-color percentage at the gradient center.
 * @returns A CSS `radial-gradient(...)` string.
 */
function themedRadial(colorVar: string, startPercent: number): string {
  const start = `color-mix(in oklab, var(${colorVar}) ${startPercent}%, transparent)`
  const end = `color-mix(in oklab, var(${colorVar}) 0%, transparent)`
  return `radial-gradient(circle, ${start} 0%, ${end} 65%)`
}

/**
 * Slow-shifting mesh-gradient backdrop tuned for a creepy, lab-specimen
 * mood: deep blood-scarlet pools, a sickly gold smear, and ink-black voids
 * drift across a charcoal field. A heartbeat-paced veil pulses underneath
 * the blobs, a film-grain noise overlay roughens the surface, and a heavy
 * scarlet-tinted vignette closes the edges. All tints come from the
 * project's theme tokens (`--color-scarlet`, `--color-gold`,
 * `--background`) via `color-mix`, so the palette stays on-brand.
 * @returns A fixed full-viewport visual layer at the back of the stack.
 */
function GradientBackdrop() {
  const noiseDataUri = useMemo(() => {
    const svg = `<?xml version='1.0' encoding='UTF-8'?>
<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'>
  <filter id='n'>
    <feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/>
    <feColorMatrix type='saturate' values='0'/>
  </filter>
  <rect width='100%' height='100%' filter='url(#n)' opacity='0.85'/>
</svg>`
    return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`
  }, [])

  const blobBase = "zoa-blob pointer-events-none absolute rounded-full"
  const blobStyle = {
    width: "70vmax",
    height: "70vmax",
    filter: "blur(90px)",
    mixBlendMode: "screen" as const,
  }

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-background"
      aria-hidden
    >
      <div
        className={blobBase}
        style={Object.assign({}, blobStyle, {
          top: "-20vmax",
          left: "-20vmax",
          background: themedRadial("--color-scarlet", 70),
          animation: "zoa-blob-a 52s ease-in-out infinite",
        })}
      />
      <div
        className={blobBase}
        style={Object.assign({}, blobStyle, {
          top: "10vmax",
          right: "-25vmax",
          background: themedRadial("--color-gold", 18),
          animation: "zoa-blob-b 64s ease-in-out infinite",
        })}
      />
      <div
        className={blobBase}
        style={Object.assign({}, blobStyle, {
          bottom: "-25vmax",
          left: "-10vmax",
          width: "80vmax",
          height: "80vmax",
          background: themedRadial("--background", 95),
          mixBlendMode: "multiply" as const,
          animation: "zoa-blob-c 71s ease-in-out infinite",
        })}
      />
      <div
        className={blobBase}
        style={Object.assign({}, blobStyle, {
          bottom: "-15vmax",
          right: "0vmax",
          background: themedRadial("--color-scarlet", 55),
          animation: "zoa-blob-d 47s ease-in-out infinite",
        })}
      />
      <div
        className={blobBase}
        style={Object.assign({}, blobStyle, {
          top: "20vmax",
          left: "20vmax",
          width: "55vmax",
          height: "55vmax",
          background: themedRadial("--color-scarlet", 40),
          animation: "zoa-blob-pulse 6s ease-in-out infinite",
          filter: "blur(110px)",
        })}
      />

      <div
        className="absolute inset-0 mix-blend-overlay"
        style={{
          backgroundImage: noiseDataUri,
          backgroundSize: "220px 220px",
          opacity: 0.12,
        }}
      />

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 35%, color-mix(in oklab, var(--background) 90%, transparent) 100%)",
        }}
      />

      <div
        className="absolute inset-0"
        style={{
          boxShadow:
            "inset 0 0 320px color-mix(in oklab, var(--color-scarlet) 35%, black), inset 0 0 120px rgba(0,0,0,0.85)",
        }}
      />
    </div>
  )
}

/**
 * Renders the scene fragment for a single figurine. Dispatches to the
 * existing `BacteriumScene` or `VirusScene` based on the figurine's kind.
 * The home scene mounts these inside drei `<View>`s so they share a single
 * WebGL context.
 * @param props.figurine - The figurine to render.
 * @returns A Three.js sub-tree (no Canvas).
 */
function FigurineModel(props: { figurine: HomeFigurine }) {
  const f = props.figurine
  if (f.kind === "virus") {
    return (
      <VirusScene
        spec={f.spec}
        selected={null}
        onSelect={noop}
        paused={false}
        phageState="scanning"
      />
    )
  }
  return (
    <BacteriumScene
      spec={f.spec}
      selected={null}
      onSelect={noop}
      paused={false}
      bacteriaState="auto"
    />
  )
}

/**
 * No-op used for the figurine scenes' `onSelect` prop on the home page,
 * where mesh-level selection is irrelevant — clicks are handled by the
 * wrapping `<Link>` elements.
 */
function noop() {}

/**
 * Standard lights + camera setup placed inside each home `<View>`. Each View
 * is its own R3F scene, so cameras and lights have to be declared per-View
 * rather than once globally.
 * @param props.figurine - Figurine whose spec determines perspective distance.
 * @returns Camera and ambient/directional lights.
 */
function ViewLighting(props: { figurine: HomeFigurine }) {
  const f = props.figurine
  const cameraZ = useMemo(() => {
    if (f.kind === "virus") {
      return fitVirusCameraZ(f.spec, 45)
    }
    return fitBacteriumCameraZ(f.spec, 45)
  }, [f.kind, f.spec])

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, cameraZ]} fov={45} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[4, 6, 5]} intensity={1.4} />
      <directionalLight position={[-4, -2, -4]} intensity={0.25} />
    </>
  )
}

interface PetriDishProps {
  figurines: HomeFigurine[]
}

/**
 * Full-viewport interactive home scene: an animated mesh-gradient backdrop
 * and real bacteria/virus 3D figurines wandering across the entire screen as
 * clickable links. All Views share a single `<Canvas>` (one WebGL context)
 * for performance.
 * @param props.figurines - Renderable figurines server-fetched on the home
 *   route. May be empty if the API is down or the DB has no specimens.
 * @returns The fixed full-bleed petri dish element.
 */
export function PetriDish(props: PetriDishProps) {
  const built = useMemo(
    () => buildFigurineState(props.figurines),
    [props.figurines],
  )
  const statics = built.statics
  const motionRef = useRef<FigurineMotion[]>(built.motion)
  // Keep the mutable motion-state array aligned with the latest `statics`.
  // Without this, HMR or a prop change can leave the ref pointing at a
  // shorter, stale array and the rAF loop reads `undefined` entries.
  if (motionRef.current !== built.motion) {
    motionRef.current = built.motion
  }
  const linkRefs = useRef<Array<HTMLAnchorElement | null>>([])

  const registerLink = useCallback(
    (index: number, el: HTMLAnchorElement | null) => {
      linkRefs.current[index] = el
    },
    [],
  )

  /*
  useEffect(() => {
    if (typeof window === "undefined") return undefined

    function handleMove(event: MouseEvent) {
      cursorX.set(event.clientX)
      cursorY.set(event.clientY)
    }

    function handleEnter() {
      setHovering(true)
    }

    function handleLeave() {
      setHovering(false)
    }

    window.addEventListener("mousemove", handleMove)
    document.documentElement.addEventListener("mouseenter", handleEnter)
    document.documentElement.addEventListener("mouseleave", handleLeave)
    return () => {
      window.removeEventListener("mousemove", handleMove)
      document.documentElement.removeEventListener("mouseenter", handleEnter)
      document.documentElement.removeEventListener("mouseleave", handleLeave)
    }
  }, [cursorX, cursorY])
  */

  useEffect(() => {
    if (typeof window === "undefined") return undefined
    if (statics.length === 0) return undefined

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches

    /**
     * Writes the current `transform` string for figurine `i` to its tracked
     * Link element. Drei's `<View>` reads the same element's bounding rect
     * each frame to set its scissor region, so the 3D figurine follows the
     * Link as it moves.
     * @param i - Figurine index.
     */
    function paint(i: number) {
      const m = motionRef.current[i]
      const transform = `translate3d(${m.x}px, ${m.y}px, 0) rotate(${m.rot}deg)`
      const linkEl = linkRefs.current[i]
      if (linkEl) linkEl.style.transform = transform
    }

    for (let i = 0; i < statics.length; i++) paint(i)

    if (reduced) return undefined

    let frame = 0
    let last = performance.now()

    /**
     * Per-frame integration step: nudges each figurine's heading by a small
     * random angular delta, advances its position, reflects the heading off
     * viewport edges, then commits the new transform to the DOM.
     * @param now - High-resolution timestamp from `requestAnimationFrame`.
     */
    function step(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now

      const w = window.innerWidth
      const h = window.innerHeight

      for (let i = 0; i < statics.length; i++) {
        const s = statics[i]
        const m = motionRef.current[i]
        const maxX = Math.max(0, w - s.size)
        const maxY = Math.max(0, h - s.size)

        m.heading = m.heading + (Math.random() - 0.5) * 1.2 * dt
        let nx = m.x + Math.cos(m.heading) * m.speed * dt
        let ny = m.y + Math.sin(m.heading) * m.speed * dt

        if (nx < 0) {
          nx = 0
          m.heading = Math.PI - m.heading
        } else if (nx > maxX) {
          nx = maxX
          m.heading = Math.PI - m.heading
        }
        if (ny < 0) {
          ny = 0
          m.heading = -m.heading
        } else if (ny > maxY) {
          ny = maxY
          m.heading = -m.heading
        }

        m.x = nx
        m.y = ny
        m.rot = m.rot + s.spinSpeed * dt
        paint(i)
      }

      frame = window.requestAnimationFrame(step)
    }

    frame = window.requestAnimationFrame(step)
    return () => window.cancelAnimationFrame(frame)
  }, [statics])

  /*
  const springX = useSpring(cursorX, SPRING_CONFIG)
  const springY = useSpring(cursorY, SPRING_CONFIG)
  const lensX = useTransform(springX, (v) => v - LENS_RADIUS)
  const lensY = useTransform(springY, (v) => v - LENS_RADIUS)
  */

  return (
    <>
      <GradientBackdrop />

      <Canvas
        className="!fixed !inset-0 !z-0"
        style={{ pointerEvents: "none" }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <View.Port />
      </Canvas>

      {statics.map((s, i) => {
        const refCb = (el: HTMLAnchorElement | null) => registerLink(i, el)
        return (
          <Link
            key={s.id}
            href={s.href}
            ref={refCb}
            aria-label={s.label}
            title={s.label}
            prefetch={false}
            className="fixed left-0 top-0 z-10 cursor-pointer outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold/50"
            style={{
              width: s.size,
              height: s.size,
              willChange: "transform",
            }}
          >
            <View
              as="div"
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
              }}
            >
              <ViewLighting figurine={s.figurine} />
              <FigurineModel figurine={s.figurine} />
            </View>
            <span className="sr-only">{s.label}</span>
          </Link>
        )
      })}

      {/*
       * Magnifier loupe (temporarily disabled): cursor-following
       * `motion.div` with a second `<View>` + nearest-figurine logic, framer
       * `useMotionValue` / `useSpring` / `useTransform`, and the pointer
       * `useEffect` block above. Uncomment `LENS_RADIUS` / `SPRING_CONFIG`.
       */}

      {statics.length === 0 ? (
        <div
          className="pointer-events-auto fixed left-1/2 top-1/2 z-20 max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-gold/20 bg-black/60 px-6 py-5 text-center backdrop-blur-md"
          role="status"
        >
          <p className="font-heading text-base tracking-wide text-gold">
            No figurines available
          </p>
          <p className="mt-2 text-sm text-parchment/70">
            Start the API and seed the archive, then refresh — only{" "}
            <span className="text-parchment">bacteria</span> and{" "}
            <span className="text-parchment">viruses</span> currently have 3D
            models.
          </p>
        </div>
      ) : null}
    </>
  )
}
