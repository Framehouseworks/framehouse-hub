'use client'

import React, { useState } from 'react'
import { GutterContainer } from '@/components/layout/GutterContainer'
import { LayoutSection } from '@/components/layout/LayoutSection'
import { cn } from '@/utilities/cn'

export type FeatureEntry = {
  name: string
  description?: string
  plan1: string
  plan2: string
  plan3: string
}

export type FeatureCategory = {
  category: string
  features: FeatureEntry[]
}

export type FeatureMatrixProps = {
  categories: FeatureCategory[]
  planNames?: [string, string, string]
}

/**
 * FeatureMatrix Component
 * 
 * An editorial-grade comparison table following "The Curated Gallery" philosophy.
 * - Minimalist alignment instead of grid lines.
 * - Rubik Mono One accents for category headers.
 * - Dynamic Plan Switcher for mobile responsiveness.
 */
export const FeatureMatrix: React.FC<FeatureMatrixProps> = ({
  categories,
  planNames = ["Independent", "Collective", "Pro Studio"]
}) => {
  const [activePlan, setActivePlan] = useState<number>(0)

  return (
    <LayoutSection className="bg-white dark:bg-[#0a0a0b] py-32 border-t border-border/30">
      <GutterContainer>
        {/* Section Header */}
        <div className="max-w-3xl mb-24">
          <label className="text-[10px] font-mono tracking-[0.4em] uppercase text-[#bb1800] mb-4 block">
            The Inventory
          </label>
          <h2 className="text-3xl md:text-5xl font-mono tracking-tighter text-[#1a1c1c] dark:text-white uppercase leading-[0.95] mb-6">
            Granular control <br />
            for every workflow.
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl">
            A technical breakdown of every sub-system. From metadata architectures to 
            enterprise-grade access controls.
          </p>
        </div>

        {/* Mobile Tier Switcher - Glassmorphism style */}
        <div className="flex md:hidden mb-12 p-1 bg-surface-container-low dark:bg-slate-900/50 backdrop-blur-md rounded-full border border-black/[0.03] dark:border-white/[0.03]">
          {planNames.map((name, i) => (
            <button
              key={i}
              onClick={() => setActivePlan(i)}
              className={cn(
                "flex-1 py-3 text-[9px] font-mono uppercase tracking-widest rounded-full transition-all duration-500",
                activePlan === i ? "bg-[#7f5700] text-white shadow-lg" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {name}
            </button>
          ))}
        </div>

        {/* Matrix Header (Desktop Only) - Sticky for better context */}
        <div className="hidden md:grid grid-cols-12 gap-8 py-8 border-b border-border/50 sticky top-[80px] bg-white/80 dark:bg-[#0a0a0b]/80 backdrop-blur-md z-20">
          <div className="col-span-6">
            <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-muted-foreground">Capabilities</span>
          </div>
          {planNames.map((name, i) => (
            <div key={i} className="col-span-2 text-center">
              <span className={cn(
                "text-[10px] font-mono uppercase tracking-[0.3em] transition-colors duration-300",
                i === 2 ? "text-[#7f5700] font-bold" : "text-muted-foreground"
              )}>
                {name}
              </span>
            </div>
          ))}
        </div>

        {/* Feature Categories */}
        <div className="space-y-24">
          {categories.map((group, groupIndex) => (
            <div key={groupIndex} className="pt-12">
              <h3 className="text-xs font-mono tracking-[0.6em] uppercase text-[#bb1800] mb-12 pl-2">
                {group.category}
              </h3>
              
              <div className="divide-y divide-border/20">
                {group.features.map((feature, featureIndex) => (
                  <div 
                    key={featureIndex} 
                    className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 py-8 group hover:bg-surface-container-low/30 dark:hover:bg-white/[0.015] transition-all duration-300 -mx-6 px-6 rounded-2xl"
                  >
                    {/* Feature Name & Description */}
                    <div className="col-span-1 md:col-span-6 flex flex-col justify-center">
                      <span className="text-sm font-bold uppercase tracking-tighter text-[#1a1c1c] dark:text-white group-hover:text-[#7f5700] transition-colors">
                        {feature.name}
                      </span>
                      {feature.description && (
                        <p className="text-[11px] text-muted-foreground mt-2 max-w-md leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">
                          {feature.description}
                        </p>
                      )}
                    </div>

                    {/* Desktop Values */}
                    <div className="hidden md:contents">
                      {[feature.plan1, feature.plan2, feature.plan3].map((val, i) => (
                        <div key={i} className="col-span-2 flex items-center justify-center text-center">
                          <span className={cn(
                            "text-[10px] font-mono uppercase tracking-widest",
                            (val === "Included" || val === "Yes" || val?.includes("∞")) 
                              ? "text-[#1a1c1c] dark:text-white font-bold" 
                              : "text-muted-foreground/40"
                          )}>
                            {val}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Mobile Value (Active Plan only) */}
                    <div className="md:hidden flex items-center justify-between pt-4 border-t border-border/10 mt-2">
                       <span className="text-[8px] font-mono uppercase tracking-[0.3em] text-[#bb1800]/60">Tier Value</span>
                       <span className={cn(
                         "text-[10px] font-mono uppercase font-bold",
                         [feature.plan1, feature.plan2, feature.plan3][activePlan] === "Included" 
                          ? "text-[#7f5700]" 
                          : "text-foreground"
                       )}>
                         {[feature.plan1, feature.plan2, feature.plan3][activePlan]}
                       </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </GutterContainer>
    </LayoutSection>
  )
}
