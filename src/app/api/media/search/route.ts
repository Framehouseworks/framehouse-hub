import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import type { MediaTypeValue } from '@/lib/storage-paths'
import { searchMediaByQuery, buildPrefixTsquery } from '@/lib/searchMedia'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALLOWED_MEDIA_TYPES: ReadonlyArray<MediaTypeValue> = [
  'image',
  'raw',
  'video',
  'audio',
  'document',
  'unclassified',
]

type Pool = {
  query: (text: string, values: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>
}

export async function GET(req: Request) {
  try {
    const headers = await getHeaders()
    const payload = await getPayload({ config: configPromise })
    const { user } = await payload.auth({ headers })
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const url = new URL(req.url)
    const q = (url.searchParams.get('q') || '').trim()
    if (!q) return NextResponse.json({ error: 'Missing required query param `q`' }, { status: 400 })
    if (q.length > 256) {
      return NextResponse.json({ error: '`q` exceeds 256-char limit' }, { status: 400 })
    }

    const type = url.searchParams.get('type') === 'suggestions' ? 'suggestions' : 'results'

    if (type === 'suggestions') {
      const pool = (payload.db as unknown as { pool?: Pool }).pool
      if (!pool) return NextResponse.json({ suggestions: [] })

      const tsquery = buildPrefixTsquery(q)
      if (!tsquery) return NextResponse.json({ suggestions: [] })

      const result = await pool.query(
        `SELECT match_value FROM (
          (SELECT title AS match_value FROM media
            WHERE owner_id = $2::int
              AND to_tsvector('english', COALESCE(title,'')) @@ to_tsquery('english', $1)
              AND title IS NOT NULL AND title <> ''
            LIMIT 4)
          UNION ALL
          (SELECT DISTINCT technical_camera_model FROM media
            WHERE owner_id = $2::int
              AND to_tsvector('english', COALESCE(technical_camera_model,'')) @@ to_tsquery('english', $1)
              AND technical_camera_model IS NOT NULL AND technical_camera_model <> ''
            LIMIT 3)
          UNION ALL
          (SELECT DISTINCT mmt.tag FROM media_manual_tags mmt
            JOIN media m ON m.id = mmt._parent_id
            WHERE m.owner_id = $2::int
              AND to_tsvector('english', COALESCE(mmt.tag,'')) @@ to_tsquery('english', $1)
              AND mmt.tag IS NOT NULL AND mmt.tag <> ''
            LIMIT 3)
        ) AS matches LIMIT 10`,
        [tsquery, String(user.id)],
      )
      const suggestions = result.rows.map((r) => String(r.match_value)).filter(Boolean)
      return NextResponse.json({ suggestions })
    }

    const rawLimit = Number(url.searchParams.get('limit'))
    const limit = Math.max(1, Math.min(50, Number.isFinite(rawLimit) ? rawLimit : 24))

    const mediaTypeParam = url.searchParams.get('mediaType') as MediaTypeValue | null
    const mediaType =
      mediaTypeParam && ALLOWED_MEDIA_TYPES.includes(mediaTypeParam) ? mediaTypeParam : null

    let docs = await searchMediaByQuery(payload, user.id, q, limit)
    if (mediaType) {
      docs = docs.filter((d) => d.mediaType === mediaType)
    }

    return NextResponse.json({ docs, totalDocs: docs.length })
  } catch (error: unknown) {
    console.error('[media/search API Error]:', error)
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
