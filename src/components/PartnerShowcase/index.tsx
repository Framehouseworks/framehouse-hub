'use client'

import React from 'react'
import { GutterContainer } from '@/components/layout/GutterContainer'
import { LayoutSection } from '@/components/layout/LayoutSection'
import { Media } from '@/components/Media'
import type { Media as MediaType } from '@/payload-types'

export type PartnerShowcaseProps = {
  logos?: { logo: string | MediaType }[]
}

/**
 * PartnerShowcase Component
 * 
 * An editorial monochromatic logo grid.
 * - logos are grayscale and 40% opaque by default.
 * - Smooth transition to color/full-opacity on hover.
 * - Subtle scale effect for interaction feedback.
 */
export const PartnerShowcase: React.FC<PartnerShowcaseProps> = ({ logos }) => {
  if (!logos || logos.length === 0) return null

  return (
    <LayoutSection className="bg-gallery-surface dark:bg-[#0a0a0b] py-24 md:py-32">
      <GutterContainer>
        <div className="flex flex-col items-center text-center">
          <label className="text-gallery-label font-rubik tracking-[0.5em] uppercase text-muted-foreground mb-16 block opacity-60">
            In Production With
          </label>
          
          <div className="flex flex-wrap justify-center items-center gap-x-16 gap-y-12 md:gap-x-24 md:gap-y-16 max-w-5xl">
            {logos.map((item, i) => (
              <div 
                key={i} 
                className="w-32 md:w-36 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-1000 ease-out cursor-default transform hover:scale-105"
              >
                <Media 
                  resource={item.logo} 
                  imgClassName="object-contain h-8 md:h-10 w-full"
                />
              </div>
            ))}
          </div>
        </div>
      </GutterContainer>
    </LayoutSection>
  )
}
