'use client'

import React from 'react'
import { LandingHero } from '@/components/LandingHero'
import { SprocketDivider } from '@/components/SprocketDivider'
import { ProductShowcase } from '@/components/ProductShowcase'
import { ProductOverview } from '@/components/ProductOverview'
import { ValueProposition } from '@/components/ValueProposition'
import { PricingPreview } from '@/components/PricingPreview'

/**
 * LandingPage Orchestrator
 * 
 * This component assembles the static landing page sections in the correct order.
 * It follows a data-first approach, where content can be passed down to individual
 * sections, facilitating a future transition to CMS-driven blocks.
 */
export const LandingPage: React.FC = () => {
  return (
    <>
      <LandingHero />
      <SprocketDivider />
      <ProductShowcase />
      <ProductOverview />
      <ValueProposition />
      <PricingPreview />
    </>
  )
}
