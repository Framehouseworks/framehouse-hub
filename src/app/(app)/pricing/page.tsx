import type { Metadata } from 'next'
import { PricingPageContent } from './PricingPageContent'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import { getPricingData } from '@/utilities/getPricingData'

/**
 * Pricing Page
 * 
 * Server Component that orchestrates Pricing data.
 * Uses the getPricingData utility to merge CMS entries with hardcoded defaults.
 */

export async function generateMetadata(): Promise<Metadata> {
  const pricingData = await getPricingData()

  const title = pricingData.metaTitle || 'Pricing | Framehouse Hub'
  const description = pricingData.metaDescription || 'Simple, transparent pricing for creative teams.'
  
  let ogImage: string | undefined = undefined
  if (pricingData.metaImage && typeof pricingData.metaImage === 'object' && 'url' in pricingData.metaImage) {
    ogImage = `${process.env.NEXT_PUBLIC_SERVER_URL}${pricingData.metaImage.url}`
  }

  return {
    title,
    description,
    openGraph: mergeOpenGraph({
      title,
      description,
      images: ogImage ? [{ url: ogImage }] : undefined,
      url: '/pricing',
    }),
  }
}

export default async function PricingPage() {
  const pricingData = await getPricingData()

  return <PricingPageContent initialData={pricingData} />
}
