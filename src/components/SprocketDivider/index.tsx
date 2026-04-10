'use client'
import { cn } from '@/utilities/cn'
import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'

import BlueHole from '@/assets/sprocket-hole/sprocket_hole_blue.svg'
import CreamHole from '@/assets/sprocket-hole/sprocket_hole_cream.svg'
import LightBlueHole from '@/assets/sprocket-hole/sprocket_hole_light_blue.svg'
import OrangeHole from '@/assets/sprocket-hole/sprocket_hole_orange.svg'
import RedHole from '@/assets/sprocket-hole/sprocket_hole_red.svg'

const HOLES = [BlueHole, CreamHole, LightBlueHole, OrangeHole, RedHole]

import { createSeededRandom } from '@/utilities/seeded-random'

export const SprocketDivider = ({ className, speed = 'medium' }: { className?: string; speed?: 'slow' | 'medium' | 'fast' }) => {
  const speeds = {
    slow: 'animate-marquee-slow',
    medium: 'animate-marquee',
    fast: 'animate-marquee-fast',
  }

  // Generate a large randomized sequence of holes to hide the loop
  const displayHoles = useMemo(() => {
    const random = createSeededRandom('sprocket-divider-v1')
    const poolSize = 100 // Ensuring seamlessness even on ultra-wide 4K+ displays
    const sequence = []
    for (let i = 0; i < poolSize; i++) {
      const randomIndex = Math.floor(random() * HOLES.length)
      sequence.push(HOLES[randomIndex])
    }
    return sequence
  }, [])

  return (
    <div className={cn("relative w-full overflow-hidden bg-background py-2", className)}>
      <div className={cn("flex w-max", speeds[speed])}>
        {/* First set of holes */}
        <div className="flex shrink-0">
          {displayHoles.map((Hole, index) => (
            <div key={`set1-${index}`} className="relative h-6 md:h-10 w-auto px-1">
              <Image
                src={Hole}
                alt="Sprocket Hole"
                className="h-full w-auto object-contain"
                priority
              />
            </div>
          ))}
        </div>
        {/* Second set of holes for seamless loop */}
        <div className="flex shrink-0">
          {displayHoles.map((Hole, index) => (
            <div key={`set2-${index}`} className="relative h-6 md:h-10 w-auto px-1">
              <Image
                src={Hole}
                alt="Sprocket Hole"
                className="h-full w-auto object-contain"
                priority
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
