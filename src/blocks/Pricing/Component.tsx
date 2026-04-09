'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'
import { cn } from '@/utilities/cn'
import { GutterContainer } from '@/components/layout/GutterContainer'
import { LayoutSection } from '@/components/layout/LayoutSection'
import { CMSLink } from '@/components/Link'
import type { PricingBlock as PricingBlockProps } from '@/payload-types'

export const PricingBlock: React.FC<PricingBlockProps> = (props) => {
  const {
    id,
    layoutType = 'cards',
    billing,
    intro,
    currency = 'GBP',
    tiers,
  } = props

  const [isYearly, setIsYearly] = useState(false)

  const currencySymbols: Record<'GBP' | 'USD' | 'EUR', string> = {
    GBP: '£',
    USD: '$',
    EUR: '€',
  }

  const symbol = currency ? currencySymbols[currency] : '£'

  return (
    <LayoutSection id={id || undefined} className="bg-surface dark:bg-[#0a0a0b] overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#d79922]/[0.03] dark:bg-[#d79922]/[0.05] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-[#bb1800]/[0.03] dark:bg-[#bb1800]/[0.05] rounded-full blur-[100px] pointer-events-none" />

      <GutterContainer className="relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="max-w-2xl">
            {intro?.heading && (
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-base font-mono tracking-[0.3em] uppercase text-[#bb1800] mb-4"
              >
                {intro.heading}
              </motion.h2>
            )}
            {intro?.subheading && (
              <motion.h3
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-3xl md:text-5xl font-mono tracking-tighter text-foreground uppercase leading-[1.1]"
              >
                {intro.subheading}
              </motion.h3>
            )}
            {intro?.showStorageEthos && (
              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="mt-6 text-sm font-mono tracking-widest uppercase text-muted-foreground flex items-center gap-2"
              >
                <span className="w-2 h-2 rounded-full bg-[#d79922] animate-pulse" />
                {intro.storageNotice}
              </motion.p>
            )}
          </div>

          {billing?.showBillingToggle && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex items-center gap-4 bg-surface-container-low dark:bg-slate-900 p-1.5 rounded-[100px] border border-border/5"
            >
              <button
                onClick={() => setIsYearly(false)}
                className={cn(
                  "px-6 py-2 rounded-[100px] text-[10px] font-mono tracking-widest uppercase transition-all duration-300",
                  !isYearly ? "bg-white dark:bg-slate-800 text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {billing.monthlyLabel}
              </button>
              <button
                onClick={() => setIsYearly(true)}
                className={cn(
                  "px-6 py-2 rounded-[100px] text-[10px] font-mono tracking-widest uppercase transition-all duration-300",
                  isYearly ? "bg-white dark:bg-slate-800 text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {billing.yearlyLabel}
                <span className="ml-2 text-[8px] text-[#bb1800]">-20%</span>
              </button>
            </motion.div>
          )}
        </div>

        <div className={cn(
          "grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch",
          layoutType === 'asymmetric' && "md:gap-12"
        )}>
          <AnimatePresence mode="wait">
            {tiers?.map((tier, i) => (
              <motion.div
                key={tier.id || i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                style={layoutType === 'asymmetric' ? { marginTop: `${i * 24}px` } : {}}
                className={cn(
                  "relative flex flex-col p-8 md:p-10 rounded-[24px] transition-all duration-500 group overflow-hidden",
                  "bg-white dark:bg-[#161618]",
                  "shadow-[0_20px_40px_rgba(26,28,28,0.04)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.4)]",
                  "hover:shadow-[0_30px_60px_rgba(26,28,28,0.08)] dark:hover:shadow-[0_0_50px_rgba(255,255,255,0.04)]",
                  tier.highlight && "ring-[0.5px] ring-[#bb1800]/20 dark:ring-[#bb1800]/40 z-10"
                )}
              >
                {/* Visual Accent */}
                <div className={cn(
                  "absolute top-0 right-0 w-32 h-32 blur-[60px] opacity-10 pointer-events-none transition-opacity group-hover:opacity-20",
                  tier.accent === 'primary' ? "bg-[#d79922]" : tier.accent === 'secondary' ? "bg-[#445aa5]" : "bg-[#bb1800]"
                )} />

                {tier.highlight && (
                  <div className="absolute top-6 right-6">
                    <div className="px-3 py-1 rounded-[100px] bg-[#bb1800] text-white text-[8px] font-mono tracking-widest uppercase shadow-lg backdrop-blur-md bg-opacity-90">
                      Recommended
                    </div>
                  </div>
                )}

                <div className="mb-10">
                  <h4 className="text-xs font-mono tracking-[0.2em] uppercase text-muted-foreground mb-4 block">
                    {tier.title}
                  </h4>
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl md:text-6xl font-mono tracking-tighter text-foreground">
                      {symbol}{tier.price}
                    </span>
                    <span className="text-sm text-muted-foreground font-mono tracking-widest uppercase">
                      /{isYearly ? 'yr' : 'mo'}
                    </span>
                  </div>
                  <p className="mt-6 text-sm text-muted-foreground leading-relaxed font-medium">
                    {tier.description}
                  </p>
                </div>

                <div className="flex-grow space-y-5 mb-10">
                  {tier.features?.map((f, fi) => (
                    <div key={f.id || fi} className="flex items-start gap-4">
                      <div className={cn(
                        "mt-1 p-0.5 rounded-full text-white",
                        tier.accent === 'primary' ? "bg-[#d79922]" : tier.accent === 'secondary' ? "bg-[#445aa5]" : "bg-[#bb1800]"
                      )}>
                        <Check size={10} strokeWidth={4} />
                      </div>
                      <span className="text-sm text-foreground/80 font-medium tracking-tight">
                        {f.feature}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-auto">
                  <CMSLink
                    {...tier.cta}
                    appearance={tier.highlight ? 'default' : 'outline'}
                    className={cn(
                      "w-full py-4 rounded-[16px] text-[10px] font-mono tracking-[0.2em] uppercase transition-all duration-300",
                      tier.highlight && "bg-[#bb1800] text-white hover:shadow-[0_15px_30px_rgba(187,24,0,0.3)] hover:-translate-y-1",
                      !tier.highlight && "hover:bg-surface-container-low dark:hover:bg-slate-800"
                    )}
                  />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </GutterContainer>
    </LayoutSection>
  )
}
