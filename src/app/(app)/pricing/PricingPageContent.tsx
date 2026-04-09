'use client'

import React, { useState } from 'react'
import { PricingHero } from '@/components/PricingHero'
import { PricingPreview } from '@/components/PricingPreview'
import { FeatureMatrix } from '@/components/FeatureMatrix'
import { PartnerShowcase } from '@/components/PartnerShowcase'
import { EnterpriseCTA } from '@/components/EnterpriseCTA'
import { mapPricingData, mapFeatureMatrix } from '@/utilities/pricingMapper'
import type { Pricing as PricingType } from '@/payload-types'

/**
 * PricingPageContent
 * 
 * Interactive layer for the Pricing Page.
 * Manages the shared state for billing cycles (Monthly/Annual) 
 * across the hero, card grid, and the deep-dive feature inventory.
 */
export const PricingPageContent: React.FC<{ initialData: PricingType }> = ({ initialData }) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')
  
  const mappedCards = mapPricingData(initialData)
  const mappedMatrix = mapFeatureMatrix(initialData)

  return (
    <main className="min-h-screen bg-white dark:bg-[#0a0a0b]">
      <PricingHero 
        billingCycle={billingCycle} 
        onBillingCycleChange={setBillingCycle} 
      />
      
      <PricingPreview 
        overline="Selection"
        heading="Professional membership tiers."
        cards={mappedCards} 
        billingCycle={billingCycle}
      />

      {/* The Inventory - Deep Dive Comparison */}
      <FeatureMatrix 
        categories={mappedMatrix}
        planNames={initialData?.plans?.map(p => p.name) as [string, string, string]}
      />

      {/* Social Proof */}
      <PartnerShowcase logos={initialData.partnerLogos} />

      {/* Final Conversion Path */}
      <EnterpriseCTA 
        heading={initialData.enterpriseHeading}
        description={initialData.enterpriseDescription}
        ctaLabel={initialData.enterpriseCtaLabel}
      />
    </main>
  )
}
