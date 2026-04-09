import type { Metadata } from 'next'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { PricingPageContent } from './PricingPageContent'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'

/**
 * Pricing Page
 * 
 * Server Component that fetches the Pricing global data from Payload CMS
 * and passes it to the interactive client-side content.
 */

export async function generateMetadata(): Promise<Metadata> {
  const payload = await getPayload({ config: configPromise })
  
  const pricingData = await payload.findGlobal({
    slug: 'pricing',
  })

  const title = pricingData.metaTitle || 'Pricing | Framehouse Hub'
  const description = pricingData.metaDescription || 'Simple, transparent pricing for creative teams.'
  
  // Robust image resolution
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
  const payload = await getPayload({ config: configPromise })
  
  const pricingData = await payload.findGlobal({
    slug: 'pricing',
  })

  return <PricingPageContent initialData={pricingData} />
}
