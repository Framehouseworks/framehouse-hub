'use client'
import Image from 'next/image'
import { useMemo } from 'react'

import ShowcasePreview from '@/assets/hub/hub_preview.webp'
import BlueHole from '@/assets/sprocket-hole/sprocket_hole_blue.svg'
import CreamHole from '@/assets/sprocket-hole/sprocket_hole_cream.svg'
import LightBlueHole from '@/assets/sprocket-hole/sprocket_hole_light_blue.svg'
import OrangeHole from '@/assets/sprocket-hole/sprocket_hole_orange.svg'
import RedHole from '@/assets/sprocket-hole/sprocket_hole_red.svg'

const HOLES = [BlueHole, CreamHole, LightBlueHole, OrangeHole, RedHole]

export const ProductShowcase = () => {
  // Generate a large grid of randomized sprocket holes for the background
  const backgroundPattern = useMemo(() => {
    const gridItems = []
    const count = 150 // Covering a large area
    for (let i = 0; i < count; i++) {
      const randomIndex = Math.floor(Math.random() * HOLES.length)
      gridItems.push(HOLES[randomIndex])
    }
    return gridItems
  }, [])

  return (
    <section className="relative w-full py-24 overflow-hidden group">
      {/* Background Layer: Randomized Sprocket Mosaic */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-10 grayscale group-hover:grayscale-0 group-hover:opacity-50 transition-all duration-1000 ease-in-out overflow-hidden flex flex-wrap justify-center gap-8 p-12 blur-sm">
        {backgroundPattern.map((Hole, index) => (
          <div
            key={index}
            className="w-12 h-20 md:w-16 md:h-20 shrink-0 rotate-90"
            style={{
              transform: `rotate(90deg) scale(${0.8 + Math.random() * 0.4})`,
              marginTop: `${Math.random() * 50}px`,
              marginLeft: `${Math.random() * 50}px`
            }}
          >
            <Image
              src={Hole}
              alt=""
              className="w-full h-full object-contain"
            />
          </div>
        ))}
      </div>

      <div className=" relative z-10 ">
        {/* Heading */}
        <div className="text-center mb-30">
          <h2 className="text-3xl md:text-5xl lg:text-7xl font-extralight font-inter tracking-tight leading-tight  bg-linear-to-b from-foreground via-foreground via-50% to-transparent bg-clip-text text-transparent">
            Built by creatives. <br />
            For creatives.
          </h2>
        </div>

        {/* Showcase Image */}
        <div className="w-full relative rounded-2xl overflow-hidden transform transition-transform duration-1000 group-hover:scale-[1.01]">
          <Image
            src={ShowcasePreview}
            alt="Framehouse Hub Platform Overview"
            className="w-full h-auto object-cover"
            priority
          />
        </div>
      </div>
    </section>
  )
}
