import { LandingPage } from '@/components/LandingPage'
import { generateMeta } from '@/utilities/generateMeta'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import configPromise from '@payload-config'
import type { Metadata } from 'next'
import { draftMode } from 'next/headers'
import { getPayload } from 'payload'
import PageTemplate from './[slug]/page'

/**
 * Root Homepage Route
 * 
 * This page handles the intelligent transition between the static landing page 
 * and the dynamic Payload CMS content.
 */
const STATIC_MODE_ENABLED = true

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

  if (STATIC_MODE_ENABLED || !page) {
    return <LandingPage />
  }

  return <PageTemplate params={Promise.resolve({ slug: 'home' })} />
}

/**
 * Metadata Generation
 * 
 * Follows a hierarchical resolution strategy:
 * 1. Payload CMS 'home' page metadata (highest priority)
 * 2. Static Fallback Metadata (defined below)
 * 3. Global OpenGraph Defaults (via mergeOpenGraph)
 */
export async function generateMetadata(): Promise<Metadata> {
  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'pages',
    limit: 1,
    where: {
      slug: {
        equals: 'home',
      },
    },
  })

  const page = result.docs?.[0]

  if (page) {
    return generateMeta({ doc: page })
  }

  return {
    title: 'Framehouse Hub | Professional Media Management',
    description: 'Manage, organise, and share your assets in a single source of truth with Framehouse Hub, the platform built for independent creatives.',
    openGraph: mergeOpenGraph({
      title: 'Framehouse Hub | Professional Media Management',
      url: '/',
    }),
  }
}
