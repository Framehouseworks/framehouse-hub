'use client'

import { cn } from '@/utilities/cn'
import { Check } from 'lucide-react'
import React from 'react'

export type PricingCardProps = {
  title: string
  priceMonthly: string
  priceAnnual: string
  description: string
  features: string[]
  ctaText: string
  highlight?: boolean
  accentColor?: string
  billingCycle?: 'monthly' | 'annual'
}

export const PricingCard: React.FC<PricingCardProps> = ({
  title,
  priceMonthly,
  priceAnnual,
  description,
  features,
  ctaText,
  highlight = false,
  accentColor = "bg-primary",
  billingCycle = 'monthly'
}) => {
  const price = billingCycle === 'monthly' ? priceMonthly : priceAnnual

  return (
    <div className={cn(
      "relative flex flex-col p-8 rounded-[24px] md:rounded-[32px] transition-all duration-500 group",
      highlight 
        ? "bg-white dark:bg-[#161618] shadow-[0_20px_40px_rgba(0,0,0,0.06)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.4)] z-10 scale-[1.02]" 
        : "bg-gallery-surface dark:bg-[#111112] border border-transparent hover:bg-white dark:hover:bg-[#161618] hover:shadow-[0_20px_40px_rgba(0,0,0,0.04)]"
    )}>
      {highlight && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-1.5 rounded-full bg-gallery-red text-white text-gallery-label-sm font-rubik tracking-[0.2em] uppercase shadow-lg z-20">
          Recommended
        </div>
      )}

      <div className="mb-8">
        <h3 className="text-gallery-label font-rubik tracking-[0.2em] uppercase text-gallery-red mb-4">
          {title}
        </h3>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl md:text-6xl font-rubik tracking-tighter text-foreground dark:text-white">
            {price}
          </span>
          <span className="text-gallery-label font-rubik text-muted-foreground uppercase tracking-widest ml-1">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
        </div>
        <p className="mt-6 text-sm font-varela text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>

      <div className="flex-grow space-y-4 mb-10">
        {features.map((feature, i) => (
          <div key={i} className="flex items-start gap-3 group/item">
            <div className={cn(
              "mt-1 w-5 h-5 rounded-full flex items-center justify-center transition-colors duration-300",
              highlight ? "bg-gallery-red text-white" : "bg-white dark:bg-slate-800 text-muted-foreground group-hover/item:text-gallery-gold"
            )}>
              <Check size={10} strokeWidth={4} />
            </div>
            <span className="text-sm font-varela text-foreground/80 leading-snug">{feature}</span>
          </div>
        ))}
      </div>

      <button className={cn(
        "w-full py-3 rounded-full text-gallery-label-sm font-rubik tracking-[0.2em] uppercase transition-all duration-500",
        highlight
          ? "bg-gallery-red text-white shadow-[0_15px_30px_rgba(187,24,0,0.2)] hover:shadow-[0_20px_40px_rgba(187,24,0,0.3)] hover:-translate-y-1"
          : "bg-white dark:bg-slate-800 text-foreground hover:bg-gallery-gold hover:text-white"
      )}>
        {ctaText}
      </button>
    </div>
  )
}

import { GutterContainer } from '@/components/layout/GutterContainer'
import { LayoutSection } from '@/components/layout/LayoutSection'

export type PricingPreviewProps = {
  overline?: string
  heading?: React.ReactNode
  cards?: PricingCardProps[]
  footnoteTitle?: string
  footnoteDescription?: string
  stats?: { value: string; label: string }[]
  billingCycle?: 'monthly' | 'annual'
}

export const DEFAULT_CONTENT: Required<PricingPreviewProps> = {
  overline: "Membership",
  heading: (
    <>
      Curated plans for <br />
      every stage of growth.
    </>
  ),
  cards: [
    {
      title: "Independent",
      priceMonthly: "£0",
      priceAnnual: "£0",
      description: "Perfect for individual creators and solo-archivists managing a curated collection.",
      features: [
        "1 Administrator Seat",
        "Core Metadata Management",
        "Search & Advanced Filtering",
        "Public Link Sharing",
        "Community Support"
      ],
      ctaText: "Start Free",
      accentColor: "bg-slate-400",
    },
    {
      title: "Collective",
      priceMonthly: "£49",
      priceAnnual: "£490",
      description: "Built for creative studios and small collectives that require shared workflows.",
      features: [
        "Up to 5 User Seats",
        "Shared Workspaces",
        "Approval Workflows",
        "Custom Metadata Schemas",
        "Brand Portals (Whitelabel)",
        "30-Day Version History"
      ],
      ctaText: "Join the Collective",
      highlight: true,
      accentColor: "bg-gallery-red",
    },
    {
      title: "Pro Studio",
      priceMonthly: "£199",
      priceAnnual: "£1990",
      description: "The definitive solution for high-volume production houses and enterprise teams.",
      features: [
        "Unlimited User Seats",
        "AI Auto-Tagging & Metadata",
        "Full Audit Logs & SAML SSO",
        "Advanced API & Webhooks",
        "Priority Global Support",
        "Custom Training"
      ],
      ctaText: "Contact Sales",
      accentColor: "bg-gallery-gold",
    },
  ],
  footnoteTitle: "Sustainable by Design",
  footnoteDescription: "We don't charge for storage—we charge for the tools that empower your creativity. Our model is built to scale with your team, not your hard drive.",
  stats: [
    { value: "99.9%", label: "Uptime SLA" },
    { value: "24/7", label: "Expert Care" },
  ],
  billingCycle: 'monthly'
}

export const PricingPreview: React.FC<PricingPreviewProps> = (props) => {
  const { 
    overline = DEFAULT_CONTENT.overline,
    heading = DEFAULT_CONTENT.heading,
    cards = DEFAULT_CONTENT.cards,
    footnoteTitle = DEFAULT_CONTENT.footnoteTitle,
    footnoteDescription = DEFAULT_CONTENT.footnoteDescription,
    stats = DEFAULT_CONTENT.stats,
    billingCycle = 'monthly'
  } = props

  return (
    <LayoutSection className="bg-white dark:bg-[#0a0a0b] py-24 md:py-32 overflow-hidden border-t border-border/10">
      {/* Background Accents */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gallery-red/2 dark:bg-gallery-red/4 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-[#445aa5]/[0.02] dark:bg-[#445aa5]/[0.04] rounded-full blur-[100px] pointer-events-none" />

      <GutterContainer className="relative z-10">
        <div className="max-w-3xl mb-16 md:mb-24">
          <label className="text-gallery-label font-rubik tracking-[0.3em] uppercase text-gallery-red mb-6 block">
            {overline}
          </label>
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-sans tracking-tighter text-foreground dark:text-white uppercase leading-[0.95] mb-6">
            {heading}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {cards.map((card, i) => (
            <PricingCard key={i} {...card} billingCycle={billingCycle} />
          ))}
        </div>

        <div className="mt-20 pt-16 flex flex-col md:flex-row justify-between gap-8 border-t border-border/10">
          <div className="max-w-sm">
            <h4 className="text-gallery-label font-rubik tracking-widest uppercase text-foreground dark:text-white mb-4">{footnoteTitle}</h4>
            <p className="text-xs font-varela text-muted-foreground leading-relaxed opacity-80">
              {footnoteDescription}
            </p>
          </div>
          <div className="flex items-center gap-12">
            {stats.map((stat, i) => (
              <div key={i} className="text-left">
                <p className="text-3xl font-rubik text-foreground dark:text-white tracking-tighter">{stat.value}</p>
                <p className="text-gallery-label-sm font-rubik tracking-[0.2em] uppercase text-gallery-red mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </GutterContainer>
    </LayoutSection>
  )
}
