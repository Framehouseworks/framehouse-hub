'use client'

import React from 'react'
import { GutterContainer } from '@/components/layout/GutterContainer'
import { LayoutSection } from '@/components/layout/LayoutSection'
import { cn } from '@/utilities/cn'

export type PricingHeroProps = {
  title?: string
  subtitle?: string
  tagline?: string
  billingCycle: 'monthly' | 'annual'
  onBillingCycleChange: (cycle: 'monthly' | 'annual') => void
}

/**
 * PricingHero Component
 * 
 * Follows the "Curated Gallery" philosophy:
 * - Editorial monospaced vertical label
 * - Minimalist glassmorphism toggle
 * - High-impact, tracking-tight typography
 */
export const PricingHero: React.FC<PricingHeroProps> = ({
  title = "Invest in your Creative Legacy.",
  subtitle = "Simple, transparent pricing for teams growing at the speed of thought.",
  tagline = "PRICING V.03",
  billingCycle,
  onBillingCycleChange
}) => {
  return (
    <LayoutSection className="pt-32 pb-16 bg-white dark:bg-[#0a0a0b] overflow-hidden">
      {/* Subtle Background Accents */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#7f5700]/[0.03] dark:bg-[#7f5700]/[0.05] rounded-full blur-[120px] pointer-events-none translate-x-1/2 -translate-y-1/2" />
      
      <GutterContainer className="relative z-10 flex flex-col items-center text-center">
        <label className="text-[10px] font-mono tracking-[0.3em] uppercase text-[#bb1800] mb-6">
          {tagline}
        </label>
        <h1 className="text-4xl md:text-7xl font-mono tracking-tighter text-[#1a1c1c] dark:text-white uppercase leading-[0.95] max-w-4xl mb-8">
          {title}
        </h1>
        <p className="text-sm md:text-lg text-muted-foreground max-w-xl mb-12 leading-relaxed">
          {subtitle}
        </p>

        {/* Pricing Toggle - Glassmorphism style */}
        <div className="relative p-1 bg-surface-container-low dark:bg-slate-900/50 backdrop-blur-md border border-black/[0.03] dark:border-white/[0.03] rounded-full flex items-center shadow-inner">
          <button
            onClick={() => onBillingCycleChange('monthly')}
            className={cn(
              "px-8 py-2.5 text-[10px] font-medium uppercase tracking-[0.2em] transition-all duration-300 rounded-full z-10",
              billingCycle === 'monthly' ? "text-white" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => onBillingCycleChange('annual')}
            className={cn(
              "px-8 py-2.5 text-[10px] font-medium uppercase tracking-[0.2em] transition-all duration-300 rounded-full z-10",
              billingCycle === 'annual' ? "text-white" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Annual
          </button>
          
          {/* Animated Slider */}
          <div 
            className={cn(
              "absolute top-1 bottom-1 w-[calc(50%-4px)] bg-[#7f5700] rounded-full transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1) shadow-[0_4px_12px_rgba(127,87,0,0.3)]",
              billingCycle === 'monthly' ? "left-1" : "left-[calc(50%+2.5px)]"
            )}
          />
        </div>
        
        {/* Savings Badge */}
        <div className="mt-6 flex items-center gap-2 opacity-80">
          <span className="text-[9px] font-mono text-[#bb1800] uppercase tracking-[0.2em]">
            Save 20% on Annual billing
          </span>
        </div>
      </GutterContainer>
    </LayoutSection>
  )
}
