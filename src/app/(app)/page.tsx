import { LandingHero } from '@/components/LandingHero'
import { ProductOverview } from '@/components/ProductOverview'
import { ProductShowcase } from '@/components/ProductShowcase'
import { SprocketDivider } from '@/components/SprocketDivider'
import { ValueProposition } from '@/components/ValueProposition'
import configPromise from '@payload-config'
import { draftMode } from 'next/headers'
import { getPayload } from 'payload'
import PageTemplate, { generateMetadata } from './[slug]/page'

export default async function Page() {
  const { isEnabled: draft } = await draftMode()
  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'pages',
    draft,
    limit: 1,
    where: {
      slug: {
        equals: 'home',
      },
    },
  })

  const page = result.docs?.[0]

  if (!page) {
    return (
      <>
        <LandingHero />
        <SprocketDivider />
        <ProductShowcase />
        <ValueProposition />
        <ProductOverview />
      </>
    )
  }

  return <PageTemplate params={Promise.resolve({ slug: 'home' })} />
}

export { generateMetadata }
