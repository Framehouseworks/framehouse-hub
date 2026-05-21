import type { Metadata } from 'next'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import { ComingSoonContent } from './ComingSoonContent'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const title = 'Coming Soon | Framehouse Hub'
  const description =
    'The premium digital asset management platform built for independent creatives. Join our waitlist for early access.'

  return {
    title,
    description,
    openGraph: mergeOpenGraph({
      title,
      description,
      url: '/coming-soon',
    }),
  }
}

export default function ComingSoonPage() {
  return <ComingSoonContent />
}
