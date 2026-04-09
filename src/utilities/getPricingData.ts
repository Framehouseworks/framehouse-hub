import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { PRICING_DEFAULTS } from '@/constants/pricingDefaults'
import { Pricing } from '@/payload-types'

/**
 * getPricingData
 * 
 * Server-side orchestrator for Pricing Page data.
 * Fetches from Payload CMS and deep-merges with hardcoded PRICING_DEFAULTS.
 * 
 * Rules:
 * 1. Strings/Numbers: CMS wins if not null.
 * 2. Arrays: CMS array replaces default if length > 0.
 * 3. Media: CMS wins if object exists; fallback to static data in components.
 */
export async function getPricingData(): Promise<Pricing> {
  const payload = await getPayload({ config: configPromise })
  
  try {
    const cmsData = await payload.findGlobal({
      slug: 'pricing',
    })

    // Deep merge logic
    const mergedData = {
      ...PRICING_DEFAULTS,
      ...cmsData,
      /**
       * Array Replacement Rule:
       * If the user has defined even one item in the CMS, 
       * we assume they want to control that list entirely.
       */
      plans: (cmsData.plans && cmsData.plans.length > 0) 
        ? cmsData.plans 
        : PRICING_DEFAULTS.plans,
        
      featureCategories: (cmsData.featureCategories && cmsData.featureCategories.length > 0)
        ? cmsData.featureCategories
        : PRICING_DEFAULTS.featureCategories,
        
      partnerLogos: (cmsData.partnerLogos && cmsData.partnerLogos.length > 0)
        ? cmsData.partnerLogos
        : (PRICING_DEFAULTS.partnerLogos || []),
    } as Pricing

    return mergedData
    
  } catch (error) {
    console.error('Error fetching Pricing data, falling back to defaults:', error)
    return PRICING_DEFAULTS as Pricing
  }
}
