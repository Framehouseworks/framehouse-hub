import type { Payload } from 'payload'
import { describe, it, beforeAll, expect } from 'vitest'
import { getTestPayload } from '../helpers/payload'

let payload: Payload

async function createOwner(suffix: string) {
  return payload.create({
    collection: 'users',
    data: {
      email: `search-${suffix}-${Date.now()}@example.test`,
      password: 'password123',
      roles: ['creative'],
    },
  })
}

type PoolAdapter = {
  pool: { query: (text: string, values: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> }
}

function searchSql(q: string, ownerId: number, limit = 10) {
  const db = (payload.db as unknown as PoolAdapter).pool
  const tsvec = `to_tsvector('english',
    COALESCE(m.title, '') || ' ' || COALESCE(m.filename, '') || ' ' ||
    COALESCE(m.original_filename, '') || ' ' || COALESCE(m.technical_camera_model, '') || ' ' ||
    COALESCE(m.technical_lens_model, '') || ' ' || COALESCE(m.shoot_name, '') || ' ' ||
    COALESCE(m.location_address, '') || ' ' ||
    COALESCE(to_char(m.capture_date, 'YYYY-MM-DD Month YYYY'), '')
  )`
  return db.query(
    `SELECT DISTINCT m.id FROM media m
     LEFT JOIN media_manual_tags mmt ON mmt._parent_id = m.id
     LEFT JOIN media_heuristic_tags mht ON mht._parent_id = m.id
     LEFT JOIN portfolios_blocks_grid_items pbgi ON pbgi.media_id = m.id
     LEFT JOIN portfolios_blocks_grid pbg ON pbg.id = pbgi._parent_id
     LEFT JOIN portfolios p ON p.id = pbg._parent_id
     WHERE m.owner_id = $2::int
       AND (
         ${tsvec} @@ plainto_tsquery('english', $1)
         OR to_tsvector('english', COALESCE(mmt.tag, '')) @@ plainto_tsquery('english', $1)
         OR to_tsvector('english', COALESCE(mht.tag, '')) @@ plainto_tsquery('english', $1)
         OR to_tsvector('english', COALESCE(p.name, '')) @@ plainto_tsquery('english', $1)
       )
     LIMIT $3`,
    [q, String(ownerId), limit],
  )
}

describe('media full-text search (FRH-44)', () => {
  beforeAll(async () => {
    payload = await getTestPayload()
  })

  it('finds media by core field (shoot_name)', async () => {
    const owner = await createOwner('core')
    const doc = await payload.create({
      collection: 'media',
      data: {
        title: 'Glacier shoot',
        alt: 'g',
        mediaType: 'image',
        shootName: 'glacierexpedition2024',
        owner: owner.id,
      },
    })

    const result = await searchSql('glacierexpedition2024', owner.id)
    const ids = result.rows.map((r) => Number(r.id))
    expect(ids).toContain(Number(doc.id))
  })

  it('finds media by manual tag via JOIN', async () => {
    const owner = await createOwner('tags')
    const doc = await payload.create({
      collection: 'media',
      data: {
        title: 'Tagged asset',
        alt: 't',
        mediaType: 'image',
        owner: owner.id,
        manualTags: [{ tag: 'droneaerial' }],
      },
    })

    const result = await searchSql('droneaerial', owner.id)
    const ids = result.rows.map((r) => Number(r.id))
    expect(ids).toContain(Number(doc.id))
  })

  it("does not return another owner's media", async () => {
    const ownerA = await createOwner('isolation-a')
    const ownerB = await createOwner('isolation-b')
    await payload.create({
      collection: 'media',
      data: { title: 'uniquexyz789', alt: 'u', mediaType: 'image', owner: ownerA.id },
    })

    const result = await searchSql('uniquexyz789', ownerB.id)
    expect(result.rows).toHaveLength(0)
  })

  it('suggestions query returns string array', async () => {
    const owner = await createOwner('sugg')
    await payload.create({
      collection: 'media',
      data: { title: 'Iceland waterfalls', alt: 'i', mediaType: 'image', owner: owner.id },
    })

    const db = (payload.db as unknown as PoolAdapter).pool
    const result = await db.query(
      `SELECT title AS match_value FROM media
       WHERE owner_id = $2::int
         AND to_tsvector('english', COALESCE(title,'')) @@ plainto_tsquery('english', $1)
         AND title IS NOT NULL AND title <> ''
       LIMIT 4`,
      ['iceland', String(owner.id)],
    )
    expect(result.rows.length).toBeGreaterThan(0)
    expect(typeof result.rows[0]?.match_value).toBe('string')
  })
})
