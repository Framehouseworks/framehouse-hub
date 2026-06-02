import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { resolveSession } from '@/lib/review-session'
import type { Portfolio } from '@/payload-types'

type Params = { params: Promise<{ slug: string }> }

const DUPLICATE_WINDOW_MS = 5 * 60 * 1000

/** POST /api/portfolio-review/[slug]/submit
 *  Creates a PortfolioClientReview from the session's current selection. */
export async function POST(req: NextRequest, { params }: Params) {
  const { slug } = await params
  const payload = await getPayload({ config: configPromise })

  const { docs } = await payload.find({
    collection: 'portfolios',
    where: { slug: { equals: slug } },
    depth: 2,
    limit: 1,
  })

  const portfolio = docs[0] as Portfolio | undefined
  if (!portfolio) {
    return NextResponse.json({ error: 'PORTFOLIO_NOT_FOUND' }, { status: 404 })
  }

  // EC-02: re-validate portfolio is still publicly accessible
  if (portfolio.visibility === 'private') {
    return NextResponse.json({ error: 'PORTFOLIO_UNAVAILABLE' }, { status: 410 })
  }

  const settings = portfolio.clientReviewSettings
  if (!settings?.allowSelection) {
    return NextResponse.json({ error: 'SELECTION_NOT_ENABLED' }, { status: 403 })
  }

  const session = await resolveSession(req, portfolio.id)
  if (!session) {
    return NextResponse.json({ error: 'SESSION_NOT_FOUND' }, { status: 401 })
  }

  if (settings.requireClientIdentification && !session.isIdentified) {
    return NextResponse.json({ error: 'IDENTIFICATION_REQUIRED' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const clientNote = typeof body?.clientNote === 'string' ? body.clientNote.trim().slice(0, 1000) : null

  // Use session's saved selections
  const savedSelections = (session.savedSelectionIds ?? []) as Array<{ mediaId: number; instanceId?: string }>
  if (savedSelections.length === 0) {
    return NextResponse.json({ error: 'SELECTION_EMPTY' }, { status: 422 })
  }

  // Build valid mediaId → item map from portfolio
  const portfolioItemMap = new Map<number, { instanceTitle?: string | null; instanceId?: string | null }>()
  for (const block of portfolio.layoutBlocks ?? []) {
    if (block.blockType !== 'grid') continue
    for (const item of block.items ?? []) {
      if (item.media && typeof item.media === 'object') {
        const mediaId = (item.media as { id: number }).id
        portfolioItemMap.set(mediaId, {
          instanceTitle: (item as Record<string, unknown>).instanceTitle as string | null | undefined,
          instanceId: (item as Record<string, unknown>).instanceId as string | null | undefined,
        })
      }
    }
  }

  // Check for unavailable items
  const unavailable = savedSelections.filter((s) => !portfolioItemMap.has(s.mediaId)).map((s) => s.mediaId)
  const validSelections = savedSelections.filter((s) => portfolioItemMap.has(s.mediaId))

  if (validSelections.length === 0) {
    return NextResponse.json({ error: 'ALL_ITEMS_UNAVAILABLE', unavailable }, { status: 422 })
  }

  // Idempotency: check for duplicate submission within 5 minutes
  const fiveMinAgo = new Date(Date.now() - DUPLICATE_WINDOW_MS).toISOString()
  const { docs: existing } = await payload.find({
    collection: 'portfolio-client-reviews',
    where: {
      and: [
        { clientSession: { equals: session.id } },
        { portfolio: { equals: portfolio.id } },
        { status: { equals: 'submitted' } },
        { submittedAt: { greater_than: fiveMinAgo } },
      ],
    },
    limit: 1,
    overrideAccess: true,
  })

  if (existing.length > 0) {
    return NextResponse.json({ reviewId: existing[0].id, alreadySubmitted: true })
  }

  const selectedItems = validSelections.map((s) => {
    const info = portfolioItemMap.get(s.mediaId)
    return {
      media: s.mediaId,
      instanceId: s.instanceId ?? info?.instanceId ?? '',
      instanceTitle: info?.instanceTitle ?? null,
    }
  })

  const review = await payload.create({
    collection: 'portfolio-client-reviews',
    data: {
      portfolio: portfolio.id,
      clientSession: session.id,
      clientName: session.clientName || 'Anonymous',
      clientEmail: session.clientEmail || null,
      status: 'submitted',
      selectedItems,
      itemCount: selectedItems.length,
      clientNote: clientNote || null,
      submittedAt: new Date().toISOString(),
    },
    overrideAccess: true,
  })

  return NextResponse.json({
    reviewId: review.id,
    alreadySubmitted: false,
    unavailable: unavailable.length > 0 ? unavailable : undefined,
  })
}
