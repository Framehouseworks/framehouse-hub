import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import type { Where } from 'payload'
import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const headers = await getHeaders()
    const payload = await getPayload({ config: configPromise })
    const { user } = await payload.auth({ headers })
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { filterQuery, manualExcludes } = body as {
      filterQuery: Record<string, unknown>
      manualExcludes?: (number | string)[]
    }

    if (!filterQuery || typeof filterQuery !== 'object') {
      return NextResponse.json({ error: 'filterQuery required' }, { status: 400 })
    }

    // Build effective query scoped to user
    const ownerClause = { owner: { equals: user.id } }
    const excludeClause =
      manualExcludes && manualExcludes.length > 0
        ? { id: { not_in: manualExcludes } }
        : null

    const effectiveWhere: Where = {
      and: [
        ownerClause as Where,
        filterQuery as Where,
        ...(excludeClause ? [excludeClause as Where] : []),
      ],
    }

    // COUNT only — no full doc hydration
    const { totalDocs } = await payload.find({
      collection: 'media',
      where: effectiveWhere,
      limit: 0,
      depth: 0,
    })

    // 4 thumbnails for preview strip
    const { docs: thumbDocs } = await payload.find({
      collection: 'media',
      where: effectiveWhere,
      limit: 4,
      depth: 0,
      sort: '-captureDate',
      select: { thumbnailUrl: true, proxyUrl: true, originalUrl: true, url: true },
    })

    const thumbnails = thumbDocs.map(
      (d) => d.thumbnailUrl || d.proxyUrl || d.originalUrl || d.url || '',
    )

    return NextResponse.json({ count: totalDocs, thumbnails })
  } catch (err) {
    console.error('[smart-collections/preview]', err)
    return NextResponse.json({ error: 'Preview failed' }, { status: 500 })
  }
}
