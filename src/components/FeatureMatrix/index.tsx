'use client'

import { GutterContainer } from '@/components/layout/GutterContainer'
import { LayoutSection } from '@/components/layout/LayoutSection'
import { cn } from '@/utilities/cn'
import { Check, X } from 'lucide-react'
import React from 'react'

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
 * TierValue Helper
 * Renders a circular gold tick for included features or a high-contrast muted X for excluded.
 */
const TierValue: React.FC<{ value: string; active?: boolean }> = ({ value, active }) => {
  const isIncluded = ["Included", "Yes", "true"].includes(value)
  const isNotIncluded = ["—", "No", "null", "false", ""].includes(value)

  if (isIncluded) {
    return (
      <div className="flex items-center justify-center">
        <div className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center shadow-sm transition-all duration-500",
          active ? "bg-[#7f5700] scale-110" : "bg-muted-foreground/10 group-hover:bg-[#7f5700]/80"
        )}>
          <Check size={12} className={cn("transition-colors", active ? "text-white" : "text-muted-foreground/40 group-hover:text-white")} strokeWidth={4} />
        </div>
      </div>
    )
  }

  if (isNotIncluded) {
    return (
      <div className="flex items-center justify-center opacity-60 group-hover:opacity-100 transition-opacity">
        {/* Updated to #71717a for WCAG AA Accessibility */}
        <X size={16} className="text-[#71717a] dark:text-[#a1a1aa]" strokeWidth={2.5} />
      </div>
    )
  }

  return (
    <span className={cn(
      "text-[10px] font-mono uppercase tracking-widest transition-colors",
      active ? "text-[#7f5700] font-bold" : "text-muted-foreground"
    )}>
      {value}
    </span>
  )
}

import { useHeader } from '@/providers/HeaderProvider'
import { motion } from 'framer-motion'

export const FeatureMatrix: React.FC<FeatureMatrixProps> = ({
  categories,
  planNames = ["Independent", "Collective", "Pro Studio"]
}) => {
  const { isVisible, setIsOpaque } = useHeader()

  /**
   * Pricing Special Scenario: 
   * Signal the Platform Nav to be 100% opaque for visual safety in this complex grid context.
   */
  React.useEffect(() => {
    setIsOpaque(true)
    return () => setIsOpaque(false)
  }, [setIsOpaque])

  return (
    <LayoutSection className="bg-white dark:bg-[#0a0a0b] py-16 md:py-32 border-t border-border/30">
      <GutterContainer>
        {/* Section Header */}
        <div className="max-w-3xl mb-16 md:mb-24">
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

        {/* Matrix Header (Kinetic Sync Orchestration) */}
        <div className="sticky top-0 z-30 -mx-6 px-6 pointer-events-none mb-12">
          <motion.div
            animate={{
              y: isVisible ? 'var(--header-total-height, 96px)' : 0
            }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className="relative bg-white dark:bg-[#0a0a0b] pointer-events-auto"
          >
            {/* 
              The Safety Shield 
              Fills the 96px gap behind the Nav with solid color 
              only when revealed, blocking all content visibility.
            */}
            <div
              className="absolute bottom-[100%] left-0 right-0 bg-white dark:bg-[#0a0a0b]"
              style={{ height: 'var(--header-total-height, 96px)' }}
            />

            <div className="grid grid-cols-12 gap-4 md:gap-8 py-4 md:py-6 border-b border-border/10">
              <div className="col-span-12 md:col-span-6 mb-2 md:mb-0">
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#bb1800] font-bold">Capabilities</span>
              </div>

              {/* Mobile Plan Names Row (Full Text) */}
              <div className="col-span-12 md:hidden grid grid-cols-3 gap-2 pb-2 items-end min-h-[40px]">
                {planNames.map((name, i) => (
                  <div key={i} className="text-center px-1">
                    <span className={cn(
                      "text-[9px] font-mono uppercase tracking-tight leading-[1.1] block break-words h-full flex items-center justify-center",
                      i === 2 ? "text-[#7f5700] font-bold" : "text-muted-foreground"
                    )}>
                      {name}
                    </span>
                  </div>
                ))}
              </div>

              {/* Desktop Plan Names */}
              {planNames.map((name, i) => (
                <div key={i} className="hidden md:block col-span-2 text-center">
                  <span className={cn(
                    "text-[10px] font-mono uppercase tracking-[0.2em] transition-colors duration-300",
                    i === 2 ? "text-[#7f5700] font-bold" : "text-muted-foreground"
                  )}>
                    {name}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Feature Categories */}
        <div className="space-y-16 md:space-y-32">
          {categories.map((group, groupIndex) => (
            <div key={groupIndex} className="pt-12 md:pt-16">
              <h3 className="text-base md:text-xl font-mono tracking-[0.2em] uppercase text-[#bb1800] mb-10 md:mb-16 pl-4 border-l-4 border-[#bb1800]/30">
                {group.category}
              </h3>

              <div className="divide-y divide-border/10">
                {group.features.map((feature, featureIndex) => (
                  <div
                    key={featureIndex}
                    className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 py-6 md:py-10 group hover:bg-surface-container-low/40 dark:hover:bg-white/[0.02] active:bg-[#f3f3f4] dark:active:bg-slate-800/50 cursor-default transition-all duration-500 -mx-6 px-6 rounded-2xl"
                  >
                    {/* Feature Name & Description */}
                    <div className="col-span-1 md:col-span-6 flex flex-col justify-center">
                      <span className="text-sm md:text-base font-bold uppercase tracking-tighter text-[#1a1c1c] dark:text-white group-hover:text-[#7f5700] transition-colors duration-500">
                        {feature.name}
                      </span>
                      {feature.description && (
                        <p className="text-[11px] md:text-xs text-muted-foreground mt-2 max-w-md leading-relaxed opacity-70 group-hover:opacity-100 transition-opacity duration-500">
                          {feature.description}
                        </p>
                      )}
                    </div>

                    {/* Desktop Values */}
                    <div className="hidden md:contents">
                      {[feature.plan1, feature.plan2, feature.plan3].map((val, i) => (
                        <div key={i} className="col-span-2 flex items-center justify-center">
                          <TierValue value={val} active={i === 2} />
                        </div>
                      ))}
                    </div>

                    {/* Mobile Comparison Grid (Icons only) */}
                    <div className="md:hidden grid grid-cols-3 gap-2 pt-4 mt-2 border-t border-border/10">
                      {[feature.plan1, feature.plan2, feature.plan3].map((val, i) => (
                        <div key={i} className="flex flex-col items-center">
                          <TierValue value={val} active={i === 2} />
                        </div>
                      ))}
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
