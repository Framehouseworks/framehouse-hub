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
          active ? "bg-gallery-gold scale-110" : "bg-muted-foreground/10 group-hover:bg-gallery-gold/80"
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
      "text-gallery-label font-mono uppercase tracking-widest transition-colors",
      active ? "text-gallery-gold font-bold" : "text-muted-foreground"
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
  const [isStuck, setIsStuck] = React.useState(false)
  const stickyRef = React.useRef<HTMLDivElement>(null)

  /**
   * Sticky Detection
   * Tracks when the table header hits the top boundary to enable kinetic sync.
   */
  React.useEffect(() => {
    const el = stickyRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsStuck(entry.intersectionRatio < 1)
      },
      { threshold: [1], rootMargin: '-1px 0px 0px 0px' }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  /**
   * Pricing Special Scenario: 
   * Signal the Platform Nav to be 100% opaque for visual safety in this complex grid context.
   */
  React.useEffect(() => {
    setIsOpaque(true)
    return () => setIsOpaque(false)
  }, [setIsOpaque])

  return (
    <LayoutSection className="bg-white dark:bg-[#0a0a0b] py-24 md:py-32 border-t border-border/10">
      <GutterContainer>
        {/* Section Header */}
        <div className="max-w-3xl mb-16 md:mb-24">
          <label className="text-gallery-label font-rubik tracking-[0.4em] uppercase text-gallery-red mb-6 block">
            The Inventory
          </label>
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-sans tracking-tighter text-foreground dark:text-white uppercase leading-[0.95] mb-6">
            Granular control <br />
            for every workflow.
          </h2>
          <p className="text-base font-varela text-muted-foreground max-w-xl leading-relaxed opacity-80">
            A technical breakdown of every sub-system. From metadata architectures to
            enterprise-grade access controls.
          </p>
        </div>

        {/* Matrix Header (Kinetic Sync Orchestration) */}
        <div 
          ref={stickyRef}
          className="sticky top-0 z-40 pointer-events-none mb-12"
        >
          <motion.div
            animate={{
              y: (isStuck && isVisible) ? 'var(--header-total-height, 96px)' : 0
            }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className="relative bg-white dark:bg-[#0a0a0b] pointer-events-auto -mx-6 px-6 border-b border-border/10"
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

            {/* Desktop Header Grid (Rebalanced 4-3-3-3) */}
            <div className="hidden md:grid grid-cols-[4fr_3fr_3fr_3fr] gap-3 py-6">
              <div className="col-span-1">
                <span className="text-gallery-label font-rubik uppercase tracking-[0.2em] text-gallery-red">Capabilities</span>
              </div>

              {/* Tier Headers */}
              {planNames.map((name, i) => (
                <div key={i} className="text-center">
                  <span className={cn(
                    "text-gallery-label-xs font-rubik uppercase tracking-tighter whitespace-nowrap transition-colors duration-300",
                    i === 2 ? "text-gallery-gold" : "text-muted-foreground"
                  )}>
                    {name}
                  </span>
                </div>
              ))}
            </div>

            {/* Mobile Header Stack (Stacked Layout) */}
            <div className="md:hidden flex flex-col pt-4 pb-6">
              <div className="mb-4 text-center">
                <span className="text-gallery-label font-rubik uppercase tracking-[0.2em] text-gallery-red">Capabilities</span>
              </div>
              <div className="grid grid-cols-3 gap-2 items-end min-h-[40px]">
                {planNames.map((name, i) => (
                  <div key={i} className="text-center px-1">
                    <span className={cn(
                      "text-gallery-label-xs font-rubik uppercase tracking-tighter whitespace-nowrap block",
                      i === 2 ? "text-gallery-gold" : "text-muted-foreground"
                    )}>
                      {name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Feature Categories */}
        <div className="space-y-16 md:space-y-24">
          {categories.map((group, groupIndex) => (
            <div key={groupIndex} className="pt-12 md:pt-16 border-t first:border-t-0 border-border/5">
              <h3 className="text-xs md:text-gallery-label font-rubik tracking-[0.2em] uppercase text-gallery-red mb-10 md:mb-16">
                {group.category}
              </h3>

              <div className="divide-y divide-border/5">
                {group.features.map((feature, featureIndex) => (
                  <div
                    key={featureIndex}
                    className="grid grid-cols-1 md:grid-cols-[4fr_3fr_3fr_3fr] gap-4 md:gap-3 py-8 md:py-12 group hover:bg-gallery-surface dark:hover:bg-white/[0.02] transition-all duration-500 -mx-6 px-6 rounded-[24px]"
                  >
                    {/* Feature Name & Description */}
                    <div className="col-span-1 flex flex-col justify-center">
                      <span className="text-sm md:text-base font-bold uppercase tracking-tight text-foreground dark:text-white group-hover:text-gallery-gold transition-colors duration-500">
                        {feature.name}
                      </span>
                      {feature.description && (
                        <p className="text-xs font-varela text-muted-foreground mt-3 max-w-md leading-relaxed opacity-70 group-hover:opacity-100 transition-opacity duration-500">
                          {feature.description}
                        </p>
                      )}
                    </div>

                    {/* Desktop Values */}
                    <div className="hidden md:contents">
                      {[feature.plan1, feature.plan2, feature.plan3].map((val, i) => (
                        <div key={i} className="flex items-center justify-center">
                          <TierValue value={val} active={i === 2} />
                        </div>
                      ))}
                    </div>

                    {/* Mobile Comparison Grid (Icons only) */}
                    <div className="md:hidden grid grid-cols-3 gap-2 pt-6 mt-4 border-t border-border/5">
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
