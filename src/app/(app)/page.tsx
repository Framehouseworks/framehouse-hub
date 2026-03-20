import PageTemplate, { generateMetadata } from './[slug]/page'
import { LandingHero } from '@/components/LandingHero'
import { ProductShowcase } from '@/components/ProductShowcase'
import { SprocketDivider } from '@/components/SprocketDivider'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { draftMode } from 'next/headers'

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
      </>
    )
  }

  return <PageTemplate params={Promise.resolve({ slug: 'home' })} />
}

export { generateMetadata }
