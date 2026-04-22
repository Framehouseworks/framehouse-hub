import type { Pricing as PricingType } from '@/payload-types'
import { PricingCardProps } from '@/components/PricingPreview'

/**
 * Pricing Mapper Utility
 * 
 * Transforms raw Payload CNS data into the structured props required by 
 * the refined Pricing components. This ensures the frontend remains decoupled 
 * from the database schema.
 */

export interface MappedPricingPlan extends PricingCardProps {
  id: string
}

export type PricingMode = 'summary' | 'detailed'

export const mapPricingData = (
  data: PricingType,
  _mode: PricingMode = 'summary'
): MappedPricingPlan[] => {
  if (!data?.plans) return []

  return data.plans.map((plan) => ({
    id: plan.id || plan.name,
    title: plan.name,
    priceMonthly: plan.priceMonthly,
    priceAnnual: plan.priceAnnual,
    description: plan.description,
    features: plan.summaryFeatures?.map((f) => f.feature) || [],
    ctaText: plan.ctaText,
    highlight: plan.isRecommended || false,
    // Add additional fields for detailed mode if needed
  }))
}

export const mapFeatureMatrix = (data: PricingType) => {
  if (!data?.featureCategories) return []

  return data.featureCategories.map((cat) => ({
    category: cat.name,
    features: cat.features?.map((f) => ({
      name: f.name,
      description: f.description ?? undefined,
      plan1: f.plan1Value ?? '—',
      plan2: f.plan2Value ?? '—',
      plan3: f.plan3Value ?? '—',
    })) || [],
  }))
}
