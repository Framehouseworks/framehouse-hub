'use client'

import React from 'react'
import { GutterContainer } from '@/components/layout/GutterContainer'
import { LayoutSection } from '@/components/layout/LayoutSection'
import { cn } from '@/utilities/cn'

export type EnterpriseCTAProps = {
  heading?: string
  description?: string
  ctaLabel?: string
}

/**
 * EnterpriseCTA Component
 * 
 * A high-conversion footer section for custom solution inquiries.
 * - Large, monochromatic heading with monospaced accents.
 * - Exhibition Red button (#bb1800) following the museum-grade palette.
 * - Subtle radial background accent for depth.
 */
export const EnterpriseCTA: React.FC<EnterpriseCTAProps> = ({
  heading = "Looking for a custom solution?",
  description = "For high-volume production houses and enterprise teams requiring custom integrations, advanced security, and dedicated support.",
  ctaLabel = "Contact Sales"
}) => {
  return (
    <LayoutSection className="bg-white dark:bg-[#0a0a0b] py-24 md:py-32 pt-0">
      <GutterContainer>
        <div className={cn(
          "relative p-12 md:p-24 rounded-[32px] overflow-hidden text-center flex flex-col items-center transition-all duration-700",
          "bg-gallery-surface dark:bg-[#111112] border border-black/[0.03] dark:border-white/[0.03] shadow-sm"
        )}>
          {/* Subtle Red Radial Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gallery-red/3 dark:bg-gallery-red/5 rounded-full blur-[100px] pointer-events-none" />
          
          <label className="text-gallery-label font-rubik tracking-[0.5em] uppercase text-gallery-red mb-10 relative z-10">
            Enterprise Solutions
          </label>
          
          <h2 className="text-4xl md:text-6xl font-sans tracking-tighter text-foreground dark:text-white uppercase leading-[0.95] max-w-3xl mb-12 relative z-10">
            {heading}
          </h2>
          
          <p className="text-base font-varela text-muted-foreground max-w-2xl mb-14 leading-relaxed opacity-80 relative z-10">
            {description}
          </p>
          
          <button className="px-10 py-5 bg-gallery-red text-white rounded-full text-gallery-label font-rubik font-bold uppercase tracking-[0.2em] shadow-[0_15px_30px_rgba(187,24,0,0.2)] hover:shadow-[0_20px_40px_rgba(187,24,0,0.3)] hover:-translate-y-1 transition-all duration-500 relative z-10 group">
            <span className="relative z-10">{ctaLabel}</span>
            <div className="absolute inset-0 bg-white/20 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left rounded-full" />
          </button>
        </div>
      </GutterContainer>
    </LayoutSection>
  )
}
