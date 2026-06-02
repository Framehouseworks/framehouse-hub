import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { resolveSession, sanitiseCommentBody } from '@/lib/review-session'
import type { Portfolio } from '@/payload-types'

type Params = { params: Promise<{ slug: string; mediaId: string }> }

const COMMENT_RATE_LIMIT = 20
const RATE_WINDOW_HOURS = 24

/** GET /api/portfolio-review/[slug]/comments/[mediaId]
 *  Returns visible comments for the specified media item in this portfolio. */
export async function GET(req: NextRequest, { params }: Params) {
  const { slug, mediaId } = await params
  const payload = await getPayload({ config: configPromise })

  const { docs: portfolioDocs } = await payload.find({
    collection: 'portfolios',
    where: { slug: { equals: slug } },
    depth: 0,
    limit: 1,
  })

  const portfolio = portfolioDocs[0] as Portfolio | undefined
  if (!portfolio) {
    return NextResponse.json({ error: 'PORTFOLIO_NOT_FOUND' }, { status: 404 })
  }

  if (!portfolio.clientReviewSettings?.allowComments) {
    return NextResponse.json({ comments: [] })
  }

  const mediaIdNum = Number(mediaId)
  if (isNaN(mediaIdNum)) {
    return NextResponse.json({ error: 'INVALID_MEDIA_ID' }, { status: 400 })
  }

  const { docs } = await payload.find({
    collection: 'portfolio-asset-comments',
    where: {
      and: [
        { portfolio: { equals: portfolio.id } },
        { media: { equals: mediaIdNum } },
        { status: { equals: 'visible' } },
      ],
    },
    sort: 'createdAt',
    limit: 100,
    overrideAccess: true,
  })

  return NextResponse.json({
    comments: docs.map((c) => ({
      id: c.id,
      clientName: c.clientName,
      body: c.body,
      createdAt: c.createdAt,
    })),
  })
}

/** POST /api/portfolio-review/[slug]/comments/[mediaId]
 *  Saves a new comment on the specified media item. */
export async function POST(req: NextRequest, { params }: Params) {
  const { slug, mediaId } = await params
  const payload = await getPayload({ config: configPromise })

  const { docs: portfolioDocs } = await payload.find({
    collection: 'portfolios',
    where: { slug: { equals: slug } },
    depth: 0,
    limit: 1,
  })

  const portfolio = portfolioDocs[0] as Portfolio | undefined
  if (!portfolio) {
    return NextResponse.json({ error: 'PORTFOLIO_NOT_FOUND' }, { status: 404 })
  }

  // EC-02: re-validate portfolio is still accessible
  if (portfolio.visibility === 'private') {
    return NextResponse.json({ error: 'PORTFOLIO_UNAVAILABLE' }, { status: 410 })
  }

  if (!portfolio.clientReviewSettings?.allowComments) {
    return NextResponse.json({ error: 'COMMENTS_NOT_ENABLED' }, { status: 403 })
  }

  const session = await resolveSession(req, portfolio.id)
  if (!session) {
    return NextResponse.json({ error: 'SESSION_NOT_FOUND' }, { status: 401 })
  }

  if (portfolio.clientReviewSettings?.requireClientIdentification && !session.isIdentified) {
    return NextResponse.json({ error: 'IDENTIFICATION_REQUIRED' }, { status: 403 })
  }

  const mediaIdNum = Number(mediaId)
  if (isNaN(mediaIdNum)) {
    return NextResponse.json({ error: 'INVALID_MEDIA_ID' }, { status: 400 })
  }

  const body = await req.json().catch(() => null)
  const rawBody = typeof body?.body === 'string' ? body.body : ''
  const cleanBody = sanitiseCommentBody(rawBody)

  if (!cleanBody) {
    return NextResponse.json({ error: 'COMMENT_EMPTY' }, { status: 400 })
  }

  // Rate limit: max 20 comments per session per 24h
  const windowStart = new Date(Date.now() - RATE_WINDOW_HOURS * 60 * 60 * 1000).toISOString()
  const { totalDocs: recentCount } = await payload.find({
    collection: 'portfolio-asset-comments',
    where: {
      and: [
        { clientSession: { equals: session.id } },
        { createdAt: { greater_than: windowStart } },
      ],
    },
    limit: 0,
    overrideAccess: true,
  })

  if (recentCount >= COMMENT_RATE_LIMIT) {
    return NextResponse.json({ error: 'RATE_LIMIT_EXCEEDED' }, { status: 429 })
  }

  const comment = await payload.create({
    collection: 'portfolio-asset-comments',
    data: {
      portfolio: portfolio.id,
      media: mediaIdNum,
      clientSession: session.id,
      clientName: session.clientName || 'Anonymous',
      clientEmail: session.clientEmail || null,
      body: cleanBody,
      status: 'visible',
    },
    overrideAccess: true,
  })

  return NextResponse.json({
    comment: {
      id: comment.id,
      clientName: comment.clientName,
      body: comment.body,
      createdAt: comment.createdAt,
    },
  })
}
