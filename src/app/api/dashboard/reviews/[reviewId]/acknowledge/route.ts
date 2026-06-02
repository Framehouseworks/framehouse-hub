import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'

type Params = { params: Promise<{ reviewId: string }> }

/** PATCH /api/dashboard/reviews/[reviewId]/acknowledge
 *  Marks a client review as acknowledged. Only portfolio owner or admin can do this. */
export async function PATCH(_req: NextRequest, { params }: Params) {
  const { reviewId } = await params
  const reviewIdNum = Number(reviewId)
  if (isNaN(reviewIdNum)) {
    return NextResponse.json({ error: 'INVALID_ID' }, { status: 400 })
  }

  const headersList = await getHeaders()
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: headersList })

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify the review exists and is accessible to this user
  const { docs } = await payload.find({
    collection: 'portfolio-client-reviews',
    where: { id: { equals: reviewIdNum } },
    depth: 1,
    limit: 1,
    overrideAccess: true,
  })

  const review = docs[0]
  if (!review) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  }

  // Check ownership: admin or portfolio owner
  const isAdmin = user.roles?.includes('admin')
  const portfolio = review.portfolio
  const portfolioOwner =
    portfolio && typeof portfolio === 'object'
      ? (portfolio as unknown as Record<string, unknown>).owner
      : null
  const ownerId = typeof portfolioOwner === 'object' && portfolioOwner !== null
    ? (portfolioOwner as { id: number }).id
    : portfolioOwner

  if (!isAdmin && ownerId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await payload.update({
    collection: 'portfolio-client-reviews',
    id: reviewIdNum,
    data: {
      status: 'acknowledged',
      acknowledgedAt: new Date().toISOString(),
      acknowledgedBy: user.id,
    },
    overrideAccess: true,
  })

  return NextResponse.json({ ok: true })
}
