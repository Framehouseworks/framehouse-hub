import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'

/** GET /api/dashboard/reviews
 *  Returns pending client reviews for portfolios owned by the authenticated user. */
export async function GET(req: NextRequest) {
  const headersList = await getHeaders()
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: headersList })

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const statusFilter = url.searchParams.get('status') ?? 'submitted'
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'))
  const limit = 20

  // Find all portfolios owned by this user first
  const { docs: portfolios } = await payload.find({
    collection: 'portfolios',
    where: { owner: { equals: user.id } },
    limit: 200,
    depth: 0,
    user,
    draft: true,
  })

  const portfolioIds = portfolios.map((p) => p.id)
  if (portfolioIds.length === 0) {
    return NextResponse.json({ docs: [], totalDocs: 0, page, limit })
  }

  const { docs, totalDocs } = await payload.find({
    collection: 'portfolio-client-reviews',
    where: {
      and: [
        { portfolio: { in: portfolioIds } },
        { status: { equals: statusFilter } },
      ],
    },
    sort: '-submittedAt',
    limit,
    page,
    depth: 1,
    overrideAccess: true,
  })

  return NextResponse.json({ docs, totalDocs, page, limit })
}
