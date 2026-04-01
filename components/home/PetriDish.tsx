"use client"

import { useRef, useState, type ComponentType, type SVGProps } from "react"
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion"
import { Dna, Bug, Worm } from "lucide-react"
import { BacteriaIcon } from "@/components/icons/BacteriaIcon"
import { MushroomIcon } from "@/components/icons/MushroomIcon"
import { AmoebaIcon } from "@/components/icons/AmoebaIcon"
import { VirusIcon } from "@/components/icons/VirusIcon"

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>

interface Microbe {
  id: number
  icon: IconComponent
  x: number
  y: number
  size: number
  rotation: number
  floatDuration: number
  floatDelay: number
}

const MICROBES: Microbe[] = [
  {
    id: 0,
    icon: Dna,
    x: 15,
    y: 22,
    size: 22,
    rotation: 30,
    floatDuration: 5,
    floatDelay: 0,
  },
  {
    id: 1,
    icon: Bug,
    x: 72,
    y: 14,
    size: 18,
    rotation: -20,
    floatDuration: 6,
    floatDelay: 0.5,
  },
  {
    id: 2,
    icon: VirusIcon,
    x: 45,
    y: 55,
    size: 18,
    rotation: 0,
    floatDuration: 4.5,
    floatDelay: 1,
  },
  {
    id: 3,
    icon: AmoebaIcon,
    x: 80,
    y: 65,
    size: 24,
    rotation: 45,
    floatDuration: 7,
    floatDelay: 0.3,
  },
  {
    id: 4,
    icon: Worm,
    x: 25,
    y: 75,
    size: 20,
    rotation: -35,
    floatDuration: 5.5,
    floatDelay: 1.2,
  },
  {
    id: 5,
    icon: MushroomIcon,
    x: 60,
    y: 30,
    size: 18,
    rotation: 15,
    floatDuration: 4,
    floatDelay: 0.8,
  },
  {
    id: 6,
    icon: BacteriaIcon,
    x: 35,
    y: 40,
    size: 26,
    rotation: -10,
    floatDuration: 6.5,
    floatDelay: 0.2,
  },
  {
    id: 7,
    icon: Dna,
    x: 85,
    y: 40,
    size: 20,
    rotation: 25,
    floatDuration: 5,
    floatDelay: 1.5,
  },
  {
    id: 8,
    icon: Bug,
    x: 50,
    y: 80,
    size: 16,
    rotation: -45,
    floatDuration: 7.5,
    floatDelay: 0.6,
  },
  {
    id: 9,
    icon: VirusIcon,
    x: 18,
    y: 50,
    size: 18,
    rotation: 60,
    floatDuration: 5.2,
    floatDelay: 0.9,
  },
  {
    id: 10,
    icon: Worm,
    x: 65,
    y: 72,
    size: 16,
    rotation: -25,
    floatDuration: 6,
    floatDelay: 1.8,
  },
  {
    id: 11,
    icon: MushroomIcon,
    x: 40,
    y: 15,
    size: 16,
    rotation: 10,
    floatDuration: 4.8,
    floatDelay: 0.4,
  },
  {
    id: 12,
    icon: AmoebaIcon,
    x: 55,
    y: 45,
    size: 20,
    rotation: -50,
    floatDuration: 5.8,
    floatDelay: 2,
  },
  {
    id: 13,
    icon: BacteriaIcon,
    x: 28,
    y: 62,
    size: 18,
    rotation: 35,
    floatDuration: 4.2,
    floatDelay: 1.1,
  },
  {
    id: 14,
    icon: Dna,
    x: 75,
    y: 82,
    size: 16,
    rotation: -15,
    floatDuration: 6.2,
    floatDelay: 0.7,
  },
  {
    id: 15,
    icon: Bug,
    x: 48,
    y: 25,
    size: 17,
    rotation: 40,
    floatDuration: 5.5,
    floatDelay: 1.4,
  },
  {
    id: 16,
    icon: VirusIcon,
    x: 10,
    y: 38,
    size: 15,
    rotation: -30,
    floatDuration: 7,
    floatDelay: 0.1,
  },
  {
    id: 17,
    icon: Worm,
    x: 68,
    y: 50,
    size: 19,
    rotation: 20,
    floatDuration: 4.6,
    floatDelay: 1.6,
  },
  {
    id: 18,
    icon: MushroomIcon,
    x: 38,
    y: 88,
    size: 17,
    rotation: -40,
    floatDuration: 5.3,
    floatDelay: 2.2,
  },
  {
    id: 19,
    icon: AmoebaIcon,
    x: 82,
    y: 25,
    size: 21,
    rotation: 55,
    floatDuration: 6.8,
    floatDelay: 0.3,
  },
  {
    id: 20,
    icon: BacteriaIcon,
    x: 22,
    y: 88,
    size: 18,
    rotation: -55,
    floatDuration: 5.7,
    floatDelay: 1.9,
  },
  {
    id: 21,
    icon: Bug,
    x: 90,
    y: 52,
    size: 14,
    rotation: 5,
    floatDuration: 4.4,
    floatDelay: 0.5,
  },
  {
    id: 22,
    icon: Worm,
    x: 52,
    y: 68,
    size: 19,
    rotation: -60,
    floatDuration: 6.4,
    floatDelay: 1.3,
  },
  {
    id: 23,
    icon: VirusIcon,
    x: 78,
    y: 88,
    size: 15,
    rotation: 50,
    floatDuration: 5.1,
    floatDelay: 0.8,
  },
]

const LENS_RADIUS = 70
const ZOOM = 1.8
const SPRING_CONFIG = { damping: 25, stiffness: 200, mass: 0.5 }

function MicrobeLayer({
  microbes,
  className,
}: {
  microbes: Microbe[]
  className?: string
}) {
  return (
    <div className={className} aria-hidden="true">
      {microbes.map((m) => {
        const Icon = m.icon
        return (
          <motion.div
            key={m.id}
            className="absolute"
            style={{
              left: `${m.x}%`,
              top: `${m.y}%`,
              rotate: m.rotation,
            }}
            animate={{ y: [0, -8, 0, 6, 0] }}
            transition={{
              duration: m.floatDuration,
              delay: m.floatDelay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <Icon
              style={{ width: m.size, height: m.size }}
              className="shrink-0"
            />
          </motion.div>
        )
      })}
    </div>
  )
}

function MagnifiedLayer({
  microbes,
  mouseX,
  mouseY,
  containerSize,
}: {
  microbes: Microbe[]
  mouseX: MotionValue<number>
  mouseY: MotionValue<number>
  containerSize: number
}) {
  const springX = useSpring(mouseX, SPRING_CONFIG)
  const springY = useSpring(mouseY, SPRING_CONFIG)

  const lensX = useTransform(springX, (v: number) => v - LENS_RADIUS)
  const lensY = useTransform(springY, (v: number) => v - LENS_RADIUS)
  const zoomOffsetX = useTransform(
    springX,
    (v: number) => LENS_RADIUS - v * ZOOM,
  )
  const zoomOffsetY = useTransform(
    springY,
    (v: number) => LENS_RADIUS - v * ZOOM,
  )

  return (
    <motion.div className="pointer-events-none absolute inset-0 z-10">
      <motion.div
        className="pointer-events-none absolute z-20"
        style={{
          width: LENS_RADIUS * 2,
          height: LENS_RADIUS * 2,
          x: lensX,
          y: lensY,
        }}
      >
        <div className="relative h-full w-full overflow-hidden rounded-full border border-white/40 bg-white/[0.12] shadow-[0_14px_28px_rgba(0,0,0,0.36),0_0_42px_rgba(255,255,255,0.18),inset_0_2px_8px_rgba(255,255,255,0.45),inset_0_-8px_16px_rgba(0,0,0,0.26)]">
          <motion.div
            className="absolute"
            style={{
              width: containerSize,
              height: containerSize,
              scale: ZOOM,
              x: zoomOffsetX,
              y: zoomOffsetY,
              transformOrigin: "top left",
            }}
          >
            <MicrobeLayer
              microbes={microbes}
              className="absolute inset-0 text-gold/65"
            />
          </motion.div>

          <div className="absolute inset-0 rounded-full bg-white/[0.05]" />
          <div className="absolute inset-[4px] rounded-full border border-white/35" />
          <div className="absolute inset-[12px] rounded-full border border-white/18" />
        </div>
      </motion.div>
    </motion.div>
  )
}

export function PetriDish() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [hovering, setHovering] = useState(false)

  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    mouseX.set(e.clientX - rect.left)
    mouseY.set(e.clientY - rect.top)
  }

  const DISH_SIZE = 600

  return (
    <div className="relative flex items-center justify-center">
      <div
        className="pointer-events-none absolute rounded-full"
        style={{
          width: DISH_SIZE * 1.6,
          height: DISH_SIZE * 1.6,
          background:
            "radial-gradient(circle, rgba(238,186,48,0.07) 0%, rgba(238,186,48,0.02) 40%, transparent 70%)",
        }}
      />

      <div
        ref={containerRef}
        className="glass relative overflow-hidden rounded-full border border-gold/15"
        style={{ width: DISH_SIZE, height: DISH_SIZE }}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <MicrobeLayer
          microbes={MICROBES}
          className="absolute inset-0 text-parchment/20"
        />

        <motion.div
          animate={{ opacity: hovering ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0"
        >
          <MagnifiedLayer
            microbes={MICROBES}
            mouseX={mouseX}
            mouseY={mouseY}
            containerSize={DISH_SIZE}
          />
        </motion.div>

        <div className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_0_60px_rgba(0,0,0,0.4)]" />
      </div>
    </div>
  )
}
