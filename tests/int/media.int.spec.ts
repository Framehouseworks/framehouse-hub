import type { Payload } from 'payload'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it, beforeAll, beforeEach, afterEach, expect, vi } from 'vitest'
import { getTestPayload } from '../helpers/payload'

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
