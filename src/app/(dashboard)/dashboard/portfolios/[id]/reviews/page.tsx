import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { PortfolioReviewsPage } from '@/components/Portfolios/reviews/PortfolioReviewsPage'

export const metadata: Metadata = { title: 'Client Reviews | Framehouse Hub' }
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

export default async function ReviewsPage({ params }: Props) {
  const { id } = await params
  if (!id) return notFound()

  const headersList = await getHeaders()
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: headersList })
  if (!user) return notFound()

  const portfolio = await payload.findByID({
    collection: 'portfolios',
    id,
    depth: 0,
    user,
  }).catch(() => null)

  if (!portfolio) return notFound()

  // Only owner or admin
  const isAdmin = user.roles?.includes('admin')
  const ownerId = typeof portfolio.owner === 'object' ? (portfolio.owner as { id: string }).id : portfolio.owner
  if (!isAdmin && ownerId !== user.id) return notFound()

  const { docs: reviews, totalDocs } = await payload.find({
    collection: 'portfolio-client-reviews',
    where: {
      and: [
        { portfolio: { equals: id } },
        { status: { equals: 'submitted' } },
      ],
    },
    sort: '-submittedAt',
    limit: 50,
    depth: 1,
    overrideAccess: true,
  })

  return (
    <PortfolioReviewsPage
      portfolioId={id}
      portfolioName={portfolio.name}
      initialReviews={reviews}
      totalDocs={totalDocs}
    />
  )
}
