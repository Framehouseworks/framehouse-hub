import type { Payload } from 'payload'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it, beforeAll, beforeEach, afterEach, expect, vi } from 'vitest'
import { getTestPayload } from '../helpers/payload'
import {
  enforceUploadSizeLimit,
  MAX_BYTES_BY_MEDIA_TYPE,
  UploadSizeLimitError,
} from '@/lib/storage-paths'

const FIXTURE_PATH = path.resolve(__dirname, '../../src/seed/fixtures/alpine-summit-01.jpg')
const MEDIA_ROOT = path.resolve(process.cwd(), 'public/media')

function loadFixture(name?: string) {
  const unique = name ?? `int-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
  return {
    data: fs.readFileSync(FIXTURE_PATH),
    name: unique,
    mimetype: 'image/jpeg',
    size: fs.statSync(FIXTURE_PATH).size,
  }
}

async function createOwner(payload: Payload, suffix: string) {
  return payload.create({
    collection: 'users',
    data: {
      email: `int-${suffix}-${Date.now()}@example.test`,
      password: 'password123',
      roles: ['creative'],
    },
  })
}

let payload: Payload

describe('Media pipeline (integration)', () => {
  beforeAll(async () => {
    payload = await getTestPayload()
  })

  describe('writeOriginalToEnclave', () => {
    it('writes original to the canonical tenant enclave path', async () => {
      const owner = await createOwner(payload, 'enclave-write')
      const file = loadFixture()
      const doc = await payload.create({
        collection: 'media',
        data: {
          title: 'Enclave write',
          alt: 'enclave',
          mediaType: 'image',
          owner: owner.id,
        },
        file,
      })

      expect(doc.storagePath).toMatch(
        new RegExp(
          `^tenants/${owner.id}/visual-media/\\d{4}/\\d{2}/[0-9a-f-]{36}/original/.+\\.jpg$`,
        ),
      )
      const onDisk = path.join(MEDIA_ROOT, doc.storagePath!)
      expect(fs.existsSync(onDisk)).toBe(true)
      expect(fs.statSync(onDisk).size).toBe(file.size)
      // originalFilename preserves the user-supplied name pre-slugify.
      expect((doc as { originalFilename?: string }).originalFilename).toBe(file.name)
    })

    it('sanitises traversal attempts in the filename', async () => {
      const owner = await createOwner(payload, 'traversal')
      const doc = await payload.create({
        collection: 'media',
        data: {
          title: 'Traversal',
          alt: 'traversal',
          mediaType: 'image',
          owner: owner.id,
        },
        file: loadFixture('../../../../etc/passwd.jpg'),
      })

      expect(doc.storagePath).not.toContain('..')
      const resolved = path.resolve(MEDIA_ROOT, doc.storagePath!)
      expect(resolved.startsWith(MEDIA_ROOT + path.sep)).toBe(true)
    })
  })

  describe('cleanupEnclave', () => {
    it('removes the tenant asset directory on delete', async () => {
      const owner = await createOwner(payload, 'cleanup')
      const doc = await payload.create({
        collection: 'media',
        data: { title: 'Cleanup', alt: 'cleanup', mediaType: 'image', owner: owner.id },
        file: loadFixture(),
      })
      const enclaveOriginal = path.join(MEDIA_ROOT, doc.storagePath!)
      const assetDir = path.dirname(path.dirname(enclaveOriginal))
      expect(fs.existsSync(assetDir)).toBe(true)

      await payload.delete({ collection: 'media', id: doc.id })

      expect(fs.existsSync(assetDir)).toBe(false)
    })
  })

  describe('enforceUploadSizeLimit', () => {
    it('allows uploads at or under the per-mediaType cap', () => {
      expect(() => enforceUploadSizeLimit('image', MAX_BYTES_BY_MEDIA_TYPE.image)).not.toThrow()
      expect(() => enforceUploadSizeLimit('image', 1)).not.toThrow()
    })

    it('throws UploadSizeLimitError above the cap with structured 413 status', () => {
      try {
        enforceUploadSizeLimit('image', MAX_BYTES_BY_MEDIA_TYPE.image + 1)
        throw new Error('expected enforceUploadSizeLimit to throw')
      } catch (err) {
        expect(err).toBeInstanceOf(UploadSizeLimitError)
        expect((err as UploadSizeLimitError).status).toBe(413)
        expect((err as UploadSizeLimitError).mediaType).toBe('image')
      }
    })

    it('uses the larger video cap for video uploads', () => {
      // 1GB video would blow the image cap but is fine as a video.
      const oneGB = 1024 * 1024 * 1024
      expect(() => enforceUploadSizeLimit('image', oneGB)).toThrow(UploadSizeLimitError)
      expect(() => enforceUploadSizeLimit('video', oneGB)).not.toThrow()
    })
  })

  describe('disableLocalStorage', () => {
    it("does not write Payload's flat-path copy", async () => {
      const owner = await createOwner(payload, 'no-flat')
      const doc = await payload.create({
        collection: 'media',
        data: { title: 'NoFlat', alt: 'noflat', mediaType: 'image', owner: owner.id },
        file: loadFixture(),
      })
      const flatPath = path.join(MEDIA_ROOT, doc.filename!)
      expect(fs.existsSync(flatPath)).toBe(false)
    })
  })

  describe('FK cascades on media delete', () => {
    // These tests exercise the migration `…210000_relax_media_block_fks`
    // directly via the drizzle adapter, bypassing the higher-level
    // Portfolios + Pricing validation. The invariant we care about is:
    //   deleting a media row referenced by either FK-bearing block table
    //   must succeed (no 25P02) and SET the FK column to NULL on the
    //   referencing row.
    type DrizzleExec = {
      execute: (sql: string) => Promise<{ rows: Array<Record<string, unknown>> }>
    }
    function db(): DrizzleExec {
      const adapter = (payload.db as unknown as { drizzle?: DrizzleExec }).drizzle
      if (!adapter) throw new Error('payload.db.drizzle not available')
      return adapter
    }

    it('portfolio grid_items.media_id is nulled (not aborted) when media is deleted', async () => {
      const owner = await createOwner(payload, 'portfolio-fk')
      const media = await payload.create({
        collection: 'media',
        data: { title: 'PortfolioRef', alt: 'p', mediaType: 'image', owner: owner.id },
        file: loadFixture(),
      })
      const blockId = `int-blk-${Date.now()}`
      const itemId = `int-itm-${Date.now()}`

      const portfolio = (
        await db().execute(
          `INSERT INTO portfolios (name, title, owner_id, visibility) VALUES ('int-portfolio', '{}'::jsonb, ${owner.id}, 'private') RETURNING id`,
        )
      ).rows[0] as { id: number }
      await db().execute(
        `INSERT INTO portfolios_blocks_grid (_order, _parent_id, _path, id) VALUES (1, ${portfolio.id}, 'layoutBlocks', '${blockId}')`,
      )
      await db().execute(
        `INSERT INTO portfolios_blocks_grid_items (_order, _parent_id, id, media_id) VALUES (1, '${blockId}', '${itemId}', ${media.id})`,
      )

      await expect(
        payload.delete({ collection: 'media', where: { id: { in: [media.id] } } }),
      ).resolves.toBeDefined()

      const result = await db().execute(
        `SELECT media_id FROM portfolios_blocks_grid_items WHERE id = '${itemId}'`,
      )
      expect(result.rows[0]?.media_id).toBeNull()
    })

    it('pricing_partner_logos.logo_id is nulled when media is deleted', async () => {
      const owner = await createOwner(payload, 'pricing-fk')
      const media = await payload.create({
        collection: 'media',
        data: { title: 'LogoRef', alt: 'l', mediaType: 'image', owner: owner.id },
        file: loadFixture(),
      })
      const logoId = `int-logo-${Date.now()}`

      const pricing = (
        await db().execute(
          `INSERT INTO pricing (updated_at, created_at) VALUES (NOW(), NOW()) RETURNING id`,
        )
      ).rows[0] as { id: number }
      await db().execute(
        `INSERT INTO pricing_partner_logos (_order, _parent_id, id, logo_id) VALUES (1, ${pricing.id}, '${logoId}', ${media.id})`,
      )

      await expect(
        payload.delete({ collection: 'media', where: { id: { in: [media.id] } } }),
      ).resolves.toBeDefined()

      const result = await db().execute(
        `SELECT logo_id FROM pricing_partner_logos WHERE id = '${logoId}'`,
      )
      expect(result.rows[0]?.logo_id).toBeNull()
    })
  })

  describe('media search SQL (GIN index)', () => {
    // Mirrors the query in /api/media/search. We don't go through the
    // route (next/headers context unavailable in vitest) — testing the
    // SQL directly proves the GIN index resolves and owner scoping works.
    it('returns owner-scoped hits ranked by tsvector relevance', async () => {
      const ownerA = await createOwner(payload, 'search-a')
      const ownerB = await createOwner(payload, 'search-b')

      const alpine = await payload.create({
        collection: 'media',
        data: {
          title: 'Alpine summit photograph',
          alt: 'alpine',
          mediaType: 'image',
          owner: ownerA.id,
          technical: { cameraModel: 'Sony A7R IV' },
        },
        file: loadFixture('search-alpine.jpg'),
      })
      const desert = await payload.create({
        collection: 'media',
        data: {
          title: 'Desert horizon study',
          alt: 'desert',
          mediaType: 'image',
          owner: ownerA.id,
          technical: { cameraModel: 'Canon EOS R5' },
        },
        file: loadFixture('search-desert.jpg'),
      })
      // Tenant B's record — must never surface in tenant A's results.
      await payload.create({
        collection: 'media',
        data: {
          title: 'Other tenant alpine',
          alt: 'other',
          mediaType: 'image',
          owner: ownerB.id,
        },
        file: loadFixture('search-other-alpine.jpg'),
      })

      const pool = (
        payload.db as unknown as {
          pool: { query: (t: string, v: unknown[]) => Promise<{ rows: { id: number }[] }> }
        }
      ).pool
      const res = await pool.query(
        `
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
          ORDER BY rank DESC, capture_date DESC NULLS LAST
          LIMIT 50
        `,
        ['alpine', String(ownerA.id)],
      )
      const ids = res.rows.map((r) => Number(r.id))
      expect(ids).toContain(alpine.id)
      expect(ids).not.toContain(desert.id) // 'alpine' doesn't appear in desert's fields
      expect(ids.length).toBe(1) // owner B's 'alpine' filtered out by owner_id scope
    })

    it('matches against camera model (technical metadata)', async () => {
      const owner = await createOwner(payload, 'search-camera')
      // extractMetadata overrides technical.cameraModel from EXIF on
      // create, so set it via update after the doc is in place — that
      // mirrors a user editing the field from the dashboard.
      const sony = await payload.create({
        collection: 'media',
        data: { title: 'Untitled', alt: 'a', mediaType: 'image', owner: owner.id },
        file: loadFixture('search-camera-sony.jpg'),
      })
      await payload.update({
        collection: 'media',
        id: sony.id,
        data: { technical: { cameraModel: 'Sony A7R IV' } },
      })
      const canon = await payload.create({
        collection: 'media',
        data: { title: 'Untitled', alt: 'a', mediaType: 'image', owner: owner.id },
        file: loadFixture('search-camera-canon.jpg'),
      })
      await payload.update({
        collection: 'media',
        id: canon.id,
        data: { technical: { cameraModel: 'Canon EOS R5' } },
      })

      const pool = (
        payload.db as unknown as {
          pool: { query: (t: string, v: unknown[]) => Promise<{ rows: { id: number }[] }> }
        }
      ).pool
      const res = await pool.query(
        `
          SELECT id FROM media
          WHERE owner_id = $2::int
            AND to_tsvector('english',
              COALESCE(title, '') || ' ' ||
              COALESCE(filename, '') || ' ' ||
              COALESCE(original_filename, '') || ' ' ||
              COALESCE(technical_camera_model, '') || ' ' ||
              COALESCE(technical_lens_model, '') || ' ' ||
              COALESCE(shoot_name, '')
            ) @@ plainto_tsquery('english', $1)
        `,
        ['sony', String(owner.id)],
      )
      const ids = res.rows.map((r) => Number(r.id))
      expect(ids).toContain(sony.id)
      expect(ids.length).toBe(1)
    })
  })

  describe('UploadBatch grouping', () => {
    it('media in the same batch share an uploadBatchId; deleting the batch nullifies the FK', async () => {
      const owner = await createOwner(payload, 'batch')
      const batch = await payload.create({
        collection: 'upload-batches',
        data: { owner: owner.id, source: 'dashboard' },
      })

      const a = await payload.create({
        collection: 'media',
        data: {
          title: 'Batch A',
          alt: 'a',
          mediaType: 'image',
          owner: owner.id,
          uploadBatchId: batch.id,
        },
        file: loadFixture('batch-a.jpg'),
      })
      const b = await payload.create({
        collection: 'media',
        data: {
          title: 'Batch B',
          alt: 'b',
          mediaType: 'image',
          owner: owner.id,
          uploadBatchId: batch.id,
        },
        file: loadFixture('batch-b.jpg'),
      })

      // Both docs carry the same batch id.
      const fetchedA = await payload.findByID({ collection: 'media', id: a.id, depth: 0 })
      const fetchedB = await payload.findByID({ collection: 'media', id: b.id, depth: 0 })
      const batchA = (fetchedA as { uploadBatchId?: number | { id: number } }).uploadBatchId
      const batchB = (fetchedB as { uploadBatchId?: number | { id: number } }).uploadBatchId
      const idA = typeof batchA === 'object' ? batchA?.id : batchA
      const idB = typeof batchB === 'object' ? batchB?.id : batchB
      expect(idA).toBe(batch.id)
      expect(idB).toBe(batch.id)

      // Delete the batch — assets survive, FK nulled.
      await payload.delete({ collection: 'upload-batches', id: batch.id })
      const afterA = await payload.findByID({ collection: 'media', id: a.id, depth: 0 })
      const afterB = await payload.findByID({ collection: 'media', id: b.id, depth: 0 })
      expect(afterA).toBeDefined()
      expect(afterB).toBeDefined()
      expect((afterA as { uploadBatchId?: unknown }).uploadBatchId == null).toBe(true)
      expect((afterB as { uploadBatchId?: unknown }).uploadBatchId == null).toBe(true)
    })
  })

  describe('triggerLocalWorker dispatch', () => {
    const originalFlag = process.env.LOCAL_ASYNC_PROCESSING
    const originalFetch = global.fetch

    beforeEach(() => {
      process.env.LOCAL_ASYNC_PROCESSING = 'true'
    })
    afterEach(() => {
      process.env.LOCAL_ASYNC_PROCESSING = originalFlag
      global.fetch = originalFetch
    })

    it('POSTs the storagePath to the worker on create', async () => {
      const fetchSpy = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
      global.fetch = fetchSpy as unknown as typeof global.fetch

      const owner = await createOwner(payload, 'dispatch')
      const doc = await payload.create({
        collection: 'media',
        data: { title: 'Dispatch', alt: 'd', mediaType: 'image', owner: owner.id },
        file: loadFixture(),
      })

      // Give the fire-and-forget fetch a tick to run.
      await new Promise((r) => setTimeout(r, 50))

      const workerCalls = fetchSpy.mock.calls.filter(([url]) =>
        String(url).includes('localhost:8080'),
      )
      expect(workerCalls.length).toBeGreaterThan(0)
      const body = JSON.parse(String(workerCalls[0][1]?.body))
      expect(body).toEqual({ bucket: 'local', name: doc.storagePath })
    })
  })
})
