'use client'

import { cn } from '@/utilities/cn'
import { Check } from 'lucide-react'
import React from 'react'

export type PricingCardProps = {
  title: string
  price: string
  description: string
  features: string[]
  ctaText: string
  highlight?: boolean
  accentColor?: string
}

const PricingCard: React.FC<PricingCardProps> = ({
  title,
  price,
  description,
  features,
  ctaText,
  highlight = false,
  accentColor = "bg-primary"
}) => {
  return (
    <div className={cn(
      "relative flex flex-col p-8 rounded-[24px] transition-all duration-300 group",
      "bg-white dark:bg-[#161618]",
      "shadow-[0_20px_40px_rgba(0,0,0,0.03)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.4)]",
      "hover:shadow-[0_30px_60px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_0_50px_rgba(255,255,255,0.04)]",
      highlight && "ring-1 ring-[#bb1800]/20 dark:ring-[#bb1800]/40 scale-[1.02] z-10"
    )}>
      {highlight && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#bb1800] text-white text-[10px] font-mono tracking-widest uppercase shadow-lg">
          Recommended
        </div>
      )}

      <div className="mb-8">
        <h3 className="text-sm font-mono tracking-[0.2em] uppercase text-muted-foreground mb-2">
          {title}
        </h3>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl md:text-5xl font-mono tracking-tighter text-foreground">
            {price}
          </span>
          <span className="text-sm text-muted-foreground font-medium">/mo</span>
        </div>
        <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>

      <div className="flex-grow space-y-4 mb-8">
        {features.map((feature, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className={cn("mt-1 p-0.5 rounded-full text-white", accentColor)}>
              <Check size={12} strokeWidth={3} />
            </div>
            <span className="text-sm text-foreground/80 font-medium">{feature}</span>
          </div>
        ))}
      </div>

      <button className={cn(
        "w-full py-4 rounded-[16px] text-sm font-bold tracking-widest uppercase transition-all duration-300",
        highlight
          ? "bg-[#bb1800] text-white shadow-[0_10px_20px_rgba(187,24,0,0.3)] hover:shadow-[0_15px_30px_rgba(187,24,0,0.4)] hover:-translate-y-0.5"
          : "bg-surface-container-low dark:bg-slate-800 text-foreground hover:bg-surface-container dark:hover:bg-slate-700"
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
      price: "£0",
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
      price: "£49",
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
      accentColor: "bg-[#bb1800]",
    },
    {
      title: "Pro Studio",
      price: "£199",
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
      accentColor: "bg-[#7f5700]",
    },
  ],
  footnoteTitle: "Sustainable by Design",
  footnoteDescription: "We don't charge for storage—we charge for the tools that empower your creativity. Our model is built to scale with your team, not your hard drive.",
  stats: [
    { value: "99.9%", label: "Uptime SLA" },
    { value: "24/7", label: "Expert Care" },
  ]
}

export const PricingPreview: React.FC<PricingPreviewProps> = (props) => {
  const { 
    overline = DEFAULT_CONTENT.overline,
    heading = DEFAULT_CONTENT.heading,
    cards = DEFAULT_CONTENT.cards,
    footnoteTitle = DEFAULT_CONTENT.footnoteTitle,
    footnoteDescription = DEFAULT_CONTENT.footnoteDescription,
    stats = DEFAULT_CONTENT.stats
  } = props

  return (
    <LayoutSection className="bg-surface dark:bg-[#0a0a0b] overflow-hidden">
      {/* Background Accents */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#bb1800]/[0.02] dark:bg-[#bb1800]/[0.04] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-[#445aa5]/[0.02] dark:bg-[#445aa5]/[0.04] rounded-full blur-[100px] pointer-events-none" />

      <GutterContainer className="relative z-10">
        <div className="max-w-3xl mb-16">
          <h2 className="text-base font-mono tracking-[0.3em] uppercase text-[#bb1800] mb-4">
            {overline}
          </h2>
          <h3 className="text-3xl md:text-5xl font-mono tracking-tighter text-foreground uppercase leading-[1.1]">
            {heading}
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {cards.map((card, i) => (
            <PricingCard key={i} {...card} />
          ))}
        </div>

        <div className="mt-16 pt-16 border-t border-border/50 flex flex-col md:flex-row justify-between gap-8">
          <div className="max-w-sm">
            <h4 className="text-sm font-mono tracking-widest uppercase text-foreground mb-2">{footnoteTitle}</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {footnoteDescription}
            </p>
          </div>
          <div className="flex items-center gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <p className="text-2xl font-mono text-foreground">{stat.value}</p>
                <p className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </GutterContainer>
    </LayoutSection>
  )
}
