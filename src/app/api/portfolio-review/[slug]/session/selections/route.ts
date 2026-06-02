import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { resolveSession } from '@/lib/review-session'
import type { Portfolio } from '@/payload-types'

type Params = { params: Promise<{ slug: string }> }

/** GET /api/portfolio-review/[slug]/session/selections
 *  Returns saved selection { mediaId, instanceId }[] for this session. */
export async function GET(req: NextRequest, { params }: Params) {
  const { slug } = await params
  const payload = await getPayload({ config: configPromise })

  const { docs } = await payload.find({
    collection: 'portfolios',
    where: { slug: { equals: slug } },
    depth: 0,
    limit: 1,
  })

  const portfolio = docs[0] as Portfolio | undefined
  if (!portfolio) {
    return NextResponse.json({ error: 'PORTFOLIO_NOT_FOUND' }, { status: 404 })
  }

  const session = await resolveSession(req, portfolio.id)
  if (!session) {
    return NextResponse.json({ selections: [] })
  }

  return NextResponse.json({ selections: session.savedSelectionIds ?? [] })
}

/** PUT /api/portfolio-review/[slug]/session/selections
 *  Saves the current selection array for this session. */
export async function PUT(req: NextRequest, { params }: Params) {
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

  const session = await resolveSession(req, portfolio.id)
  if (!session) {
    return NextResponse.json({ error: 'SESSION_NOT_FOUND' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const selections: Array<{ mediaId: number; instanceId?: string }> = Array.isArray(body?.selections)
    ? body.selections
    : []

  // Build set of all valid mediaIds currently in this portfolio
  const validMediaIds = new Set<number>()
  for (const block of portfolio.layoutBlocks ?? []) {
    if (block.blockType !== 'grid') continue
    for (const item of block.items ?? []) {
      if (item.media && typeof item.media === 'object') {
        validMediaIds.add((item.media as { id: number }).id)
      }
    }
  }

  // Filter out any IDs not in the portfolio
  const valid = selections
    .filter((s) => typeof s.mediaId === 'number' && validMediaIds.has(s.mediaId))
    .slice(0, 200) // hard cap

  await payload.update({
    collection: 'portfolio-client-sessions',
    id: session.id,
    data: {
      savedSelectionIds: valid.map((s) => ({
        mediaId: s.mediaId,
        instanceId: s.instanceId ?? '',
      })),
    },
    overrideAccess: true,
  })

  return NextResponse.json({ ok: true, savedCount: valid.length })
}
