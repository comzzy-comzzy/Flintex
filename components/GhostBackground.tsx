'use client'

import { CandlestickChart, Hexagon, Zap, type LucideIcon } from 'lucide-react'
import { usePathname } from 'next/navigation'
import type { CSSProperties } from 'react'

type GhostIcon = {
  icon: LucideIcon
  top: number
  left: number
  size: number
  duration: number
  delay: number
  driftX: number
  driftY: number
  rotation: number
}

const seeded = (seed: number) => {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return value - Math.floor(value)
}

const positions = [
  { top: 8, left: 8 },
  { top: 10, left: 42 },
  { top: 9, left: 78 },
  { top: 24, left: 18 },
  { top: 26, left: 54 },
  { top: 28, left: 86 },
  { top: 44, left: 12 },
  { top: 46, left: 40 },
  { top: 48, left: 74 },
  { top: 64, left: 18 },
  { top: 66, left: 48 },
  { top: 62, left: 82 },
  { top: 82, left: 10 },
  { top: 84, left: 42 },
  { top: 80, left: 76 },
]

const icons = [Hexagon, CandlestickChart, Zap]

const ghosts: GhostIcon[] = positions.map((position, index) => {
  const seed = index + 1
  const size = 30 + Math.round(seeded(seed + 11) * 50)
  const duration = 15 + seeded(seed + 21) * 10
  const delay = -seeded(seed + 31) * 25
  const driftMagnitudeX = 12 + seeded(seed + 41) * 20
  const driftMagnitudeY = 12 + seeded(seed + 51) * 20
  const driftX = (seeded(seed + 61) > 0.5 ? 1 : -1) * driftMagnitudeX
  const driftY = (seeded(seed + 71) > 0.5 ? 1 : -1) * driftMagnitudeY
  const rotation = (seeded(seed + 81) > 0.5 ? 1 : -1) * (6 + seeded(seed + 91) * 12)

  return {
    icon: icons[index % icons.length],
    top: position.top,
    left: position.left,
    size,
    duration,
    delay,
    driftX,
    driftY,
    rotation,
  }
})

export default function GhostBackground() {
  const pathname = usePathname()
  const shouldShow = pathname === '/' || pathname === '/portfolio' || pathname === '/markets' || pathname === '/bets'

  if (!shouldShow) return null

  return (
    <div className="ghost-background" aria-hidden="true">
      {ghosts.map((ghost, index) => {
        const Icon = ghost.icon

        return (
          <span
            className="ghost-icon-shell"
            key={`${ghost.top}-${ghost.left}-${index}`}
            style={{
              top: `${ghost.top}%`,
              left: `${ghost.left}%`,
              width: `${ghost.size}px`,
              height: `${ghost.size}px`,
              animationDuration: `${ghost.duration}s`,
              animationDelay: `${ghost.delay}s`,
              ['--ghost-dx' as string]: `${ghost.driftX}px`,
              ['--ghost-dy' as string]: `${ghost.driftY}px`,
              ['--ghost-rotation' as string]: `${ghost.rotation}deg`,
            } as CSSProperties}
          >
            <Icon className="ghost-icon" strokeWidth={1.35} />
          </span>
        )
      })}
    </div>
  )
}
