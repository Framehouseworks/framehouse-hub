import type { Payload } from 'payload'
import { describe, it, beforeAll, expect } from 'vitest'
import { getTestPayload } from '../helpers/payload'
import { transferEndpoints } from '@/collections/Transfers/endpoints'

let payload: Payload
let testUserId: number

describe('Transfers Collection (Phase 1 Integration)', () => {
  beforeAll(async () => {
    payload = await getTestPayload()

    // Seed test creative user
    const user = await payload.create({
      collection: 'users',
      data: {
        email: `transfer-creative-${Date.now()}@example.test`,
        password: 'password123',
        roles: ['creative'],
      },
    })
    testUserId = user.id
  })

  describe('Schema & Field Defaults', () => {
    it('creates transfer with auto-assigned sender, shareHash, and 3-day expiry', async () => {
      const transfer = await payload.create({
        collection: 'transfers',
        data: {
          filename: 'Campaign_Deliverables_4K.zip',
          filesize: 104857600, // 100MB
          mimeType: 'application/zip',
          storagePath: 'transfers/test/tr_123/original/campaign-deliverables-4k.zip',
          title: 'Campaign 4K Master',
        },
        user: { id: testUserId } as any,
      })

      expect(transfer.id).toBeDefined()
      expect(transfer.shareHash).toMatch(/^tr_[a-f0-9]{12}$/)
      expect(transfer.filename).toBe('Campaign_Deliverables_4K.zip')
      expect(transfer.filesize).toBe(104857600)
      expect(transfer.mimeType).toBe('application/zip')
      expect(transfer.status).toBe('active')
      expect(transfer.downloadCount).toBe(0)

      // Verify sender was auto-assigned via hook
      const senderId =
        typeof transfer.sender === 'object' ? (transfer.sender as { id: number }).id : transfer.sender
      expect(senderId).toBe(testUserId)

      // Verify 3-day (72 hours) expiration calculation
      const createdAt = new Date(transfer.createdAt).getTime()
      const expiresAt = new Date(transfer.expiresAt).getTime()
      const diffHours = (expiresAt - createdAt) / (1000 * 60 * 60)
      expect(Math.round(diffHours)).toBe(72)
    })

    it('rejects transfers exceeding 250MB via field validation', async () => {
      const overLimitSize = 250 * 1024 * 1024 + 1 // 250MB + 1 byte

      await expect(
        payload.create({
          collection: 'transfers',
          data: {
            filename: 'Oversized_Raw_Archive.iso',
            filesize: overLimitSize,
            mimeType: 'application/octet-stream',
            storagePath: 'transfers/test/tr_over/original/oversized.iso',
          },
          user: { id: testUserId } as any,
        }),
      ).rejects.toThrow()
    })
  })

  describe('Access Control', () => {
    it('allows public read for active unexpired transfer by shareHash', async () => {
      const created = await payload.create({
        collection: 'transfers',
        data: {
          filename: 'Public_Teaser.mp4',
          filesize: 15728640,
          mimeType: 'video/mp4',
          storagePath: 'transfers/test/tr_pub/original/public-teaser.mp4',
        },
        user: { id: testUserId } as any,
      })

      // Query without user (unauthenticated / public recipient) with access control enforced
      const result = await payload.find({
        collection: 'transfers',
        where: {
          shareHash: { equals: created.shareHash },
        },
        overrideAccess: false,
      })

      expect(result.docs.length).toBe(1)
      expect(result.docs[0].filename).toBe('Public_Teaser.mp4')
    })

    it('hides expired transfers from public queries', async () => {
      const expiredDate = new Date(Date.now() - 1000 * 60 * 60).toISOString() // 1 hour ago
      const expired = await payload.create({
        collection: 'transfers',
        data: {
          filename: 'Expired_Contract.pdf',
          filesize: 1048576,
          mimeType: 'application/pdf',
          storagePath: 'transfers/test/tr_exp/original/expired.pdf',
          expiresAt: expiredDate,
        },
        user: { id: testUserId } as any,
      })

      // Query without user (public) with access control enforced
      const result = await payload.find({
        collection: 'transfers',
        where: {
          shareHash: { equals: expired.shareHash },
        },
        overrideAccess: false,
      })

      expect(result.docs.length).toBe(0)
    })
  })

  describe('Collection Endpoints', () => {
    const signedUrlEndpoint = transferEndpoints?.find((e) => e.path === '/signed-url')
    const downloadEndpoint = transferEndpoints?.find((e) => e.path === '/:shareHash/download')

    it('signed-url endpoint rejects unauthenticated requests with 401', async () => {
      expect(signedUrlEndpoint).toBeDefined()
      const req: any = {
        user: null,
        json: async () => ({ filename: 'test.zip', filesize: 1000 }),
      }
      const res = await signedUrlEndpoint!.handler(req)
      expect(res.status).toBe(401)
    })

    it('signed-url endpoint rejects files exceeding 250MB with 413', async () => {
      expect(signedUrlEndpoint).toBeDefined()
      const req: any = {
        user: { id: testUserId },
        json: async () => ({
          filename: 'oversize.mov',
          filesize: 250 * 1024 * 1024 + 100, // >250MB
        }),
      }
      const res = await signedUrlEndpoint!.handler(req)
      expect(res.status).toBe(413)
    })

    it('signed-url endpoint mints shareHash and storagePath for valid requests', async () => {
      expect(signedUrlEndpoint).toBeDefined()
      const req: any = {
        user: { id: testUserId },
        json: async () => ({
          filename: 'Valid_Cut.mov',
          filesize: 10485760, // 10MB
          mimeType: 'video/quicktime',
        }),
      }
      const res = await signedUrlEndpoint!.handler(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.shareHash).toMatch(/^tr_[a-f0-9]{12}$/)
      expect(data.storagePath).toContain(`transfers/${testUserId}/${data.shareHash}/original/valid-cut.mov`)
      expect(data.mimeType).toBe('video/quicktime')
    })

    it('download endpoint returns 410 for non-existent or expired transfer', async () => {
      expect(downloadEndpoint).toBeDefined()
      const req: any = {
        routeParams: { shareHash: 'tr_nonexistent' },
        payload,
      }
      const res = await downloadEndpoint!.handler(req)
      expect(res.status).toBe(410)
    })
  })
})
