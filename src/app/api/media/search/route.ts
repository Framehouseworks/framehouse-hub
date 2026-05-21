import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import type { MediaTypeValue } from '@/lib/storage-paths'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// FRH-52 phase C: full-text media search backed by the existing
// media_search_idx GIN index. Owner-scoped server-side so user A can
// never reach user B's docs. Raw SQL returns only ids; Payload's
// find({ where: { id: { in: [...] } } }) hydrates with access control
// so the wire response respects collection-level permissions.
//
// POC search vector covers: title, filename, original_filename,
// technical_camera_model, technical_lens_model, shoot_name.
// Anything else (manualTags, location, captureDate) is intentionally
// deferred — Elasticsearch territory.

type DrizzleExec = {
  execute: (query: { queryChunks?: unknown } | unknown) => Promise<{
    rows: Array<Record<string, unknown>>
  }>
}

const ALLOWED_MEDIA_TYPES: ReadonlyArray<MediaTypeValue> = [
  'image',
  'raw',
  'video',
  'audio',
  'document',
  'unclassified',
]

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

    const rawLimit = Number(url.searchParams.get('limit'))
    const limit = Math.max(1, Math.min(50, Number.isFinite(rawLimit) ? rawLimit : 24))

    const mediaTypeParam = url.searchParams.get('mediaType') as MediaTypeValue | null
    const mediaType =
      mediaTypeParam && ALLOWED_MEDIA_TYPES.includes(mediaTypeParam) ? mediaTypeParam : null

    // payload.db.drizzle.execute uses parameterised SQL via the sql tag.
    // We bind via the postgres pool's pg-driver placeholders, but the
    // Payload abstraction expects an sql`` template tag. Use the
    // adapter's exposed `sql` to bind parameters safely — never
    // interpolate user input into the query string.
    const dbAdapter = payload.db as unknown as {
      drizzle: DrizzleExec
      pool?: {
        query: (text: string, values: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>
      }
    }
    if (!dbAdapter.pool) {
      return NextResponse.json(
        { error: 'Search requires postgres adapter; pool missing' },
        { status: 500 },
      )
    }

    const params: unknown[] = [q, String(user.id), limit]
    let sqlText = `
      SELECT id, ts_rank(
        to_tsvector('english',
          COALESCE(title, '') || ' ' ||
          COALESCE(filename, '') || ' ' ||
          COALESCE(original_filename, '') || ' ' ||
          COALESCE(technical_camera_model, '') || ' ' ||
          COALESCE(technical_lens_model, '') || ' ' ||
          COALESCE(shoot_name, '')
        ),
        plainto_tsquery('english', $1)
      ) AS rank
      FROM media
      WHERE owner_id = $2::int
        AND to_tsvector('english',
          COALESCE(title, '') || ' ' ||
          COALESCE(filename, '') || ' ' ||
          COALESCE(original_filename, '') || ' ' ||
          COALESCE(technical_camera_model, '') || ' ' ||
          COALESCE(technical_lens_model, '') || ' ' ||
          COALESCE(shoot_name, '')
        ) @@ plainto_tsquery('english', $1)
    `
    if (mediaType) {
      params.push(mediaType)
      sqlText += ` AND media_type = $${params.length}`
    }
    sqlText += ` ORDER BY rank DESC, capture_date DESC NULLS LAST LIMIT $3`

    const result = await dbAdapter.pool.query(sqlText, params)
    const ids = result.rows.map((r) => Number(r.id)).filter((n) => Number.isFinite(n))

    if (ids.length === 0) {
      return NextResponse.json({ docs: [], totalDocs: 0 })
    }

    // Hydrate via Payload so access rules + relationship depth apply.
    const hydrated = await payload.find({
      collection: 'media',
      where: { id: { in: ids } },
      limit: ids.length,
      depth: 0,
      overrideAccess: false,
      user,
    })
    // Preserve the relevance ordering from the SQL ranking.
    const byId = new Map(hydrated.docs.map((d) => [Number(d.id), d]))
    const ordered = ids.map((id) => byId.get(id)).filter(Boolean)

    return NextResponse.json({ docs: ordered, totalDocs: ordered.length })
  } catch (error: unknown) {
    console.error('[media/search API Error]:', error)
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
