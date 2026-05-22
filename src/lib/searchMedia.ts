import type { Payload } from 'payload'
import type { Media } from '@/payload-types'

const FULL_TSVECTOR = `to_tsvector('english',
  COALESCE(m.title, '') || ' ' || COALESCE(m.filename, '') || ' ' ||
  COALESCE(m.original_filename, '') || ' ' || COALESCE(m.technical_camera_model, '') || ' ' ||
  COALESCE(m.technical_lens_model, '') || ' ' || COALESCE(m.shoot_name, '') || ' ' ||
  COALESCE(m.location_address, '')
)`

type Pool = {
  query: (text: string, values: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>
}

// Converts a raw query string into a prefix tsquery: "desert hor" → "desert:* & hor:*"
// so partial words match. Strips non-alphanumeric chars to keep to_tsquery happy.
export function buildPrefixTsquery(q: string): string {
  const terms = q
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z0-9]/g, ''))
    .filter(Boolean)
  return terms.map((t) => `${t}:*`).join(' & ')
}

export async function searchMediaByQuery(
  payload: Payload,
  ownerId: number,
  q: string,
  limit = 100,
): Promise<Media[]> {
  const pool = (payload.db as unknown as { pool?: Pool }).pool
  if (!pool) return []

  const tsquery = buildPrefixTsquery(q)
  if (!tsquery) return []

  const result = await pool.query(
    `SELECT id FROM (
       SELECT m.id,
         MAX(ts_rank(${FULL_TSVECTOR}, to_tsquery('english', $1))) AS rank
       FROM media m
       LEFT JOIN media_manual_tags mmt ON mmt._parent_id = m.id
       LEFT JOIN media_heuristic_tags mht ON mht._parent_id = m.id
       LEFT JOIN portfolios_blocks_grid_items pbgi ON pbgi.media_id = m.id
       LEFT JOIN portfolios_blocks_grid pbg ON pbg.id = pbgi._parent_id
       LEFT JOIN portfolios p ON p.id = pbg._parent_id
       WHERE m.owner_id = $2::int
         AND (
           ${FULL_TSVECTOR} @@ to_tsquery('english', $1)
           OR to_tsvector('english', COALESCE(mmt.tag, '')) @@ to_tsquery('english', $1)
           OR to_tsvector('english', COALESCE(mht.tag, '')) @@ to_tsquery('english', $1)
           OR to_tsvector('english', COALESCE(p.name, '')) @@ to_tsquery('english', $1)
         )
       GROUP BY m.id
     ) sub
     ORDER BY rank DESC
     LIMIT $3`,
    [tsquery, String(ownerId), limit],
  )

  const ids = result.rows.map((r) => Number(r.id)).filter((n) => Number.isFinite(n))
  if (ids.length === 0) return []

  const hydrated = await payload.find({
    collection: 'media',
    where: { id: { in: ids } },
    limit: ids.length,
    depth: 0,
    overrideAccess: true,
  })

  const byId = new Map(hydrated.docs.map((d) => [Number(d.id), d]))
  return ids.map((id) => byId.get(id)).filter(Boolean) as Media[]
}
