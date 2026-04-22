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

const HOLES = [BlueHole, CreamHole, LightBlueHole, OrangeHole, RedHole]

import { createSeededRandom } from '@/utilities/seeded-random'

import { GutterContainer } from '@/components/layout/GutterContainer'
import { LayoutSection } from '@/components/layout/LayoutSection'

export type ProductShowcaseProps = {
  title?: React.ReactNode
  image?: StaticImageData
}

export const DEFAULT_CONTENT: Required<ProductShowcaseProps> = {
  title: (
    <>
      Built by creatives. <br />
      For creatives.
    </>
  ),
  image: ShowcasePreview,
}

export const ProductShowcase: React.FC<ProductShowcaseProps> = (props) => {
  const { title = DEFAULT_CONTENT.title, image = DEFAULT_CONTENT.image } = props

  // Generate a large grid of randomized sprocket holes for the background
  const backgroundPattern = useMemo(() => {
    const random = createSeededRandom('product-showcase-mosaic')
    const gridItems = []
    const count = 150 // Covering a large area
    for (let i = 0; i < count; i++) {
      const randomIndex = Math.floor(random() * HOLES.length)
      gridItems.push(HOLES[randomIndex])
    }
    return gridItems
  }, [])

  // Create a second generator for stable inline transforms
  const styleRandom = useMemo(() => {
    const random = createSeededRandom('product-showcase-styles')
    return backgroundPattern.map(() => ({
      scale: 0.8 + random() * 0.4,
      marginTop: random() * 50,
      marginLeft: random() * 50
    }))
  }, [backgroundPattern])

  return (
    <LayoutSection className="overflow-hidden group" bleed>
      {/* Background Layer: Randomized Sprocket Mosaic */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-10 grayscale group-hover:grayscale-0 group-hover:opacity-50 transition-all duration-1000 ease-in-out overflow-hidden flex flex-wrap justify-center gap-8 p-12 blur-sm">
        {backgroundPattern.map((Hole, index) => {
          const style = styleRandom[index]

          return (
            <div
              key={index}
              className="w-12 h-20 md:w-16 md:h-20 shrink-0 rotate-90"
              style={{
                transform: `rotate(90deg) scale(${style.scale})`,
                marginTop: `${style.marginTop}px`,
                marginLeft: `${style.marginLeft}px`
              }}
            >
              <Image
                src={Hole}
                alt=""
                className="w-full h-full object-contain"
              />
            </div>
          )
        })}
      </div>

      <GutterContainer className="relative z-10">
        {/* Heading */}
        <div className="text-center mb-16 md:mb-24 lg:mb-32">
          <h2 className="text-3xl md:text-5xl lg:text-7xl font-extralight font-inter tracking-tight leading-tight bg-linear-to-b from-foreground via-foreground via-50% to-transparent bg-clip-text text-transparent">
            {title}
          </h2>
        </div>

        {/* Showcase Image */}
        <div className="w-full relative rounded-2xl overflow-hidden transform transition-transform duration-1000 group-hover:scale-[1.01]">
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
