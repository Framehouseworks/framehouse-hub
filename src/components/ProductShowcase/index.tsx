'use client'

import Image, { StaticImageData } from 'next/image'
import { useMemo } from 'react'
import React from 'react'

import ShowcasePreview from '@/assets/hub/hub_preview.webp'
import BlueHole from '@/assets/sprocket-hole/sprocket_hole_blue.svg'
import CreamHole from '@/assets/sprocket-hole/sprocket_hole_cream.svg'
import LightBlueHole from '@/assets/sprocket-hole/sprocket_hole_light_blue.svg'
import OrangeHole from '@/assets/sprocket-hole/sprocket_hole_orange.svg'
import RedHole from '@/assets/sprocket-hole/sprocket_hole_red.svg'

import { createSeededRandom } from '@/utilities/seeded-random'
import { GutterContainer } from '@/components/layout/GutterContainer'
import { LayoutSection } from '@/components/layout/LayoutSection'

const HOLES = [BlueHole, CreamHole, LightBlueHole, OrangeHole, RedHole]

// 80 items: enough to fill ultra-wide screens without 150-node DOM overhead.
const POOL_SIZE = 80

export type ProductShowcaseProps = {
  title?: React.ReactNode
  image?: StaticImageData
}

const DEFAULT_CONTENT = {
  title: (
    <>
      Built by creatives. <br />
      For creatives.
    </>
  ),
  image: ShowcasePreview,
} satisfies Required<ProductShowcaseProps>

export const ProductShowcase: React.FC<ProductShowcaseProps> = (props) => {
  const { title = DEFAULT_CONTENT.title, image = DEFAULT_CONTENT.image } = props

  // Seeded random ensures consistent SSR/CSR render — no hydration mismatch.
  const holes = useMemo(() => {
    const rng = createSeededRandom('product-showcase-mosaic')
    return Array.from({ length: POOL_SIZE }, () => ({
      Hole: HOLES[Math.floor(rng() * HOLES.length)],
      scale: 0.8 + rng() * 0.4,
      mt: rng() * 50,
      ml: rng() * 50,
    }))
  }, [])

  return (
    <LayoutSection className="overflow-hidden group" bleed>
      {/* Sprocket mosaic background */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-10 grayscale group-hover:grayscale-0 group-hover:opacity-50 transition-all duration-1000 ease-in-out overflow-hidden flex flex-wrap justify-center gap-8 p-12 blur-sm"
        aria-hidden
      >
        {holes.map(({ Hole, scale, mt, ml }, i) => (
          <div
            key={i}
            className="w-12 h-20 md:w-16 md:h-20 shrink-0"
            style={{ transform: `rotate(90deg) scale(${scale})`, marginTop: mt, marginLeft: ml }}
          >
            <Image src={Hole} alt="" className="w-full h-full object-contain" />
          </div>
        ))}
      </div>

      <GutterContainer className="relative z-10">
        <div className="text-center mb-16 md:mb-24 lg:mb-32">
          <h2 className="text-3xl md:text-5xl lg:text-7xl font-extralight tracking-tight leading-tight bg-linear-to-b from-foreground via-foreground via-50% to-transparent bg-clip-text text-transparent">
            {title}
          </h2>
        </div>

        <div className="w-full relative rounded-[20px] overflow-hidden transition-transform duration-1000 group-hover:scale-[1.01]">
          <Image
            src={image}
            alt="Framehouse Hub Platform Overview"
            className="w-full h-auto object-cover"
            priority
          />
        </div>
      </GutterContainer>
    </LayoutSection>
  )
}
