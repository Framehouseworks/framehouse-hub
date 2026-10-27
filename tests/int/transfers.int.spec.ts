import type { Payload } from 'payload'
import { describe, it, beforeAll, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { getTestPayload } from '../helpers/payload'
import { transferEndpoints } from '@/collections/Transfers/endpoints'
import { uploadTransfer, TransferUploadError, MAX_TRANSFER_BYTES } from '@/lib/transfer-upload'

let payload: Payload
let testUserId: string

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
        draft: true,
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
        typeof transfer.sender === 'object' ? (transfer.sender as { id: string }).id : transfer.sender
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
        draft: true,
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
        draft: true,
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
        draft: true,
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
    const signedUrlEndpoint = (transferEndpoints as any)?.find((e: any) => e.path === '/signed-url')
    const downloadEndpoint = (transferEndpoints as any)?.find((e: any) => e.path === '/:shareHash/download')

    it('signed-url endpoint rejects unauthenticated requests with 401', async () => {
      expect(signedUrlEndpoint).toBeDefined()
      const req: any = {
        user: null,
        json: async () => ({ filename: 'test.zip', filesize: 1000 }),
      }
      const res = await signedUrlEndpoint!.handler(req)
      expect(res.status).toBe(401)
    })

    it('signed-url endpoint rejects viewer role with 401', async () => {
      expect(signedUrlEndpoint).toBeDefined()
      const req: any = {
        user: { id: 999, roles: ['viewer'] },
        json: async () => ({ filename: 'test.zip', filesize: 1000 }),
      }
      const res = await signedUrlEndpoint!.handler(req)
      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.error).toBe('Unauthorized — active creative account required')
    })

    it('signed-url endpoint rejects files exceeding 250MB with 413', async () => {
      expect(signedUrlEndpoint).toBeDefined()
      const req: any = {
        user: { id: testUserId, roles: ['creative'] },
        json: async () => ({
          filename: 'oversize.mov',
          filesize: 250 * 1024 * 1024 + 100, // >250MB
        }),
      }
      const res = await signedUrlEndpoint!.handler(req)
      expect(res.status).toBe(413)
      const data = await res.json()
      expect(data.error).toBe('File exceeds 250MB transfer limit')
    })

    it('signed-url endpoint mints shareHash and storagePath for valid requests', async () => {
      expect(signedUrlEndpoint).toBeDefined()
      const req: any = {
        user: { id: testUserId, roles: ['creative'] },
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

    const uploadLocalEndpoint = (transferEndpoints as any)?.find((e: any) => e.path === '/upload-local')

    it('upload-local endpoint rejects unauthenticated requests with 401', async () => {
      expect(uploadLocalEndpoint).toBeDefined()
      const req: any = {
        user: null,
        headers: new Headers({ 'x-storage-path': 'transfers/1/test/original/test.txt' }),
      }
      const res = await uploadLocalEndpoint!.handler(req)
      expect(res.status).toBe(401)
    })

    it('upload-local endpoint rejects path traversal with 400', async () => {
      expect(uploadLocalEndpoint).toBeDefined()
      const req: any = {
        user: { id: testUserId, roles: ['creative'] },
        headers: new Headers({ 'x-storage-path': 'transfers/../../../etc/passwd' }),
      }
      const res = await uploadLocalEndpoint!.handler(req)
      expect(res.status).toBe(400)
    })

    it('upload-local endpoint rejects cross-tenant path spoofing with 403', async () => {
      expect(uploadLocalEndpoint).toBeDefined()
      const req: any = {
        user: { id: testUserId, roles: ['creative'] },
        headers: new Headers({ 'x-storage-path': 'transfers/999999/spoofed/original/hacked.txt' }),
      }
      const res = await uploadLocalEndpoint!.handler(req)
      expect(res.status).toBe(403)
      const data = await res.json()
      expect(data.error).toBe('Storage path does not match authenticated user')
    })

    it('handles local upload and streaming download end-to-end with counter increment', async () => {
      expect(uploadLocalEndpoint).toBeDefined()
      expect(downloadEndpoint).toBeDefined()

      const testContent = 'FRAME_HOUSE_HUB_DELIVERABLE_BITSTREAM_TEST'
      const testBuffer = Buffer.from(testContent, 'utf-8')
      const shareHash = `tr_e2e_${Date.now()}`
      const storagePath = `transfers/${testUserId}/${shareHash}/original/deliverable.txt`

      // 1. Upload via upload-local endpoint
      const uploadReq: any = {
        user: { id: testUserId, roles: ['creative'] },
        headers: new Headers({ 'x-storage-path': storagePath }),
        arrayBuffer: async () =>
          testBuffer.buffer.slice(testBuffer.byteOffset, testBuffer.byteOffset + testBuffer.byteLength),
      }
      const uploadRes = await uploadLocalEndpoint!.handler(uploadReq)
      expect(uploadRes.status).toBe(200)

      // 2. Create database transfer record
      const transfer = await payload.create({
        draft: true,
        collection: 'transfers',
        data: {
          shareHash,
          filename: 'Deliverable Final & Master.txt',
          filesize: testBuffer.byteLength,
          mimeType: 'text/plain',
          storagePath,
          status: 'active',
        },
        user: { id: testUserId } as any,
      })
      expect(transfer.downloadCount).toBe(0)

      // 3. Download via download endpoint
      const downloadReq: any = {
        routeParams: { shareHash },
        payload,
      }
      const downloadRes = await downloadEndpoint!.handler(downloadReq)
      expect(downloadRes.status).toBe(200)
      expect(downloadRes.headers.get('Content-Type')).toBe('text/plain')
      expect(downloadRes.headers.get('Content-Length')).toBe(String(testBuffer.byteLength))
      expect(downloadRes.headers.get('Content-Disposition')).toContain('attachment;')
      expect(downloadRes.headers.get('Content-Disposition')).toContain('filename*=UTF-8')

      // Read stream content
      const downloadedText = await downloadRes.text()
      expect(downloadedText).toBe(testContent)

      // Wait a moment for background counter update
      await new Promise((r) => setTimeout(r, 100))

      // 4. Verify atomic counter incremented
      const refreshed = await payload.findByID({
        collection: 'transfers',
        id: transfer.id,
      })
      expect(refreshed.downloadCount).toBe(1)
      expect(refreshed.lastDownloadedAt).toBeDefined()

      // 5. Clean up created transfer and verify enclave directory removal
      await payload.delete({
        collection: 'transfers',
        id: transfer.id,
        user: { id: testUserId } as any,
      })
      const diskPath = path.resolve(process.cwd(), 'public/media', storagePath)
      expect(fs.existsSync(diskPath)).toBe(false)
      expect(fs.existsSync(path.dirname(diskPath))).toBe(false)
      expect(fs.existsSync(path.dirname(path.dirname(diskPath)))).toBe(false)
    })
  })

  describe('Transfer Upload Service (Client Pre-flight)', () => {
    it('rejects oversized files client-side before network dispatch', async () => {
      const mockOversizedFile = {
        name: 'too_large.zip',
        size: MAX_TRANSFER_BYTES + 1024,
        type: 'application/zip',
      } as unknown as File

      await expect(
        uploadTransfer({ file: mockOversizedFile }),
      ).rejects.toThrow(TransferUploadError)

      try {
        await uploadTransfer({ file: mockOversizedFile })
      } catch (err: any) {
        expect(err).toBeInstanceOf(TransferUploadError)
        expect(err.status).toBe(413)
        expect(err.message).toContain('exceeds our 250MB transfer limit')
      }
    })

    it('rejects empty files with 0 bytes', async () => {
      const mockEmptyFile = {
        name: 'empty.txt',
        size: 0,
        type: 'text/plain',
      } as unknown as File

      await expect(
        uploadTransfer({ file: mockEmptyFile }),
      ).rejects.toThrow('empty')
    })
  })

  describe('Lifecycle, Expiration & Manual Revocation', () => {
    const downloadEndpoint = (transferEndpoints as any)?.find((e: any) => e.path === '/:shareHash/download')

    it('enforces 1-minute expiration: renders transfer inaccessible and returns 410', async () => {
      // Simulate a short-lived transfer whose 1-minute window expired
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString()
      const transfer = await payload.create({
        draft: true,
        collection: 'transfers',
        data: {
          filename: 'Quick_Proof_1min.pdf',
          filesize: 2048,
          mimeType: 'application/pdf',
          storagePath: `transfers/${testUserId}/tr_1min/original/quick-proof-1min.pdf`,
          expiresAt: oneMinuteAgo,
        },
        user: { id: testUserId } as any,
      })

      // 1. Verify unauthenticated public read with access control returns 0 results
      const publicQuery = await payload.find({
        collection: 'transfers',
        where: { shareHash: { equals: transfer.shareHash } },
        overrideAccess: false,
      })
      expect(publicQuery.docs.length).toBe(0)

      // 2. Verify download endpoint returns HTTP 410 Gone
      const req: any = {
        routeParams: { shareHash: transfer.shareHash },
        payload,
      }
      const res = await downloadEndpoint!.handler(req)
      expect(res.status).toBe(410)
    })

    it('allows sender to manually revoke / expire transfer early, cutting off download access', async () => {
      // Create active transfer
      const transfer = await payload.create({
        draft: true,
        collection: 'transfers',
        data: {
          filename: 'Confidential_Rough.mp4',
          filesize: 5000,
          mimeType: 'video/mp4',
          storagePath: `transfers/${testUserId}/tr_revoke/original/confidential.mp4`,
          status: 'active',
        },
        user: { id: testUserId } as any,
      })

      expect(transfer.status).toBe('active')

      // Sender manually revokes / expires early
      const revoked = await payload.update({
        collection: 'transfers',
        id: transfer.id,
        data: {
          status: 'revoked',
        },
        user: { id: testUserId } as any,
      })
      expect(revoked.status).toBe('revoked')

      // 1. Verify public access query is blocked
      const publicQuery = await payload.find({
        collection: 'transfers',
        where: { shareHash: { equals: transfer.shareHash } },
        overrideAccess: false,
      })
      expect(publicQuery.docs.length).toBe(0)

      // 2. Verify download endpoint returns 410 Gone
      const req: any = {
        routeParams: { shareHash: transfer.shareHash },
        payload,
      }
      const res = await downloadEndpoint!.handler(req)
      expect(res.status).toBe(410)
    })

    it('deletes physical storage bytes when transfer document is deleted', async () => {
      const shareHash = `tr_del_${Date.now()}`
      const filename = 'deliverable_to_delete.txt'
      const relativeStoragePath = `transfers/${testUserId}/${shareHash}/original/${filename}`
      const fullDiskPath = path.resolve(process.cwd(), 'public/media', relativeStoragePath)

      // Ensure directory exists and write test physical file to local enclave
      fs.mkdirSync(path.dirname(fullDiskPath), { recursive: true })
      fs.writeFileSync(fullDiskPath, 'PHYSICAL_BITSTREAM_CONTENT_TO_BE_PURGED', 'utf-8')
      expect(fs.existsSync(fullDiskPath)).toBe(true)

      // Create database transfer record
      const transfer = await payload.create({
        draft: true,
        collection: 'transfers',
        data: {
          shareHash,
          filename,
          filesize: 40,
          mimeType: 'text/plain',
          storagePath: relativeStoragePath,
          status: 'active',
        },
        user: { id: testUserId } as any,
      })

      // Delete the transfer via Payload API (triggers cleanupTransferFile hook)
      await payload.delete({
        collection: 'transfers',
        id: transfer.id,
        user: { id: testUserId } as any,
      })

      // Verify the physical file was purged from disk
      expect(fs.existsSync(fullDiskPath)).toBe(false)
      // Verify the parent transfer directory and original directory were also purged
      const originalDirPath = path.dirname(fullDiskPath)
      const shareDirPath = path.dirname(originalDirPath)
      expect(fs.existsSync(originalDirPath)).toBe(false)
      expect(fs.existsSync(shareDirPath)).toBe(false)
    })

    it('rejects transfer creation when expiresAt exceeds 3 days (72 hours)', async () => {
      const farFutureExpiry = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()

      try {
        await payload.create({
          collection: 'transfers',
          data: {
            shareHash: 'tr_test_reject',
            sender: testUserId,
            filename: 'too_long_expiry.pdf',
            filesize: 1024,
            mimeType: 'application/pdf',
            storagePath: `transfers/${testUserId}/tr_invalid_exp/original/too-long-expiry.pdf`,
            expiresAt: farFutureExpiry,
          },
          user: { id: testUserId } as any,
        })
        expect.unreachable('Should have thrown ValidationError')
      } catch (err: any) {
        expect(err.name).toBe('ValidationError')
        expect(err.message).toContain('The following field is invalid: Expires At')
        const fieldError = (err.data?.errors || err.errors)?.find(
          (e: any) => e.path === 'expiresAt' || e.field === 'expiresAt',
        )
        expect(fieldError?.message).toContain('Transfer expiration cannot exceed 3 days')
      }
    })

    it('allows transfer creation when expiresAt is within 3 days', async () => {
      const validFutureExpiry = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()

      const transfer = await payload.create({
        collection: 'transfers',
        data: {
          shareHash: 'tr_test_accept',
          sender: testUserId,
          filename: 'valid_expiry.pdf',
          filesize: 1024,
          mimeType: 'application/pdf',
          storagePath: `transfers/${testUserId}/tr_valid_exp/original/valid-expiry.pdf`,
          expiresAt: validFutureExpiry,
        },
        user: { id: testUserId } as any,
      })

      expect(transfer.id).toBeDefined()
      expect(new Date(transfer.expiresAt).getTime()).toBeCloseTo(new Date(validFutureExpiry).getTime(), -3)
    })
  })

  describe('Public Recipient Resolution (Phase 4)', () => {
    it('resolves active transfer with populated sender details for public recipient view', async () => {
      const transfer = await payload.create({
        draft: true,
        collection: 'transfers',
        data: {
          filename: 'Presentation_Deck_Final.pdf',
          filesize: 5242880,
          mimeType: 'application/pdf',
          storagePath: `transfers/${testUserId}/tr_p4_valid/original/deck.pdf`,
          title: 'Final Client Deck',
          message: 'Please review before Friday',
          status: 'active',
        },
        user: { id: testUserId } as any,
      })

      // Simulate RSC query from src/app/(app)/transfer/[shareHash]/page.tsx
      const { docs } = await payload.find({
        collection: 'transfers',
        where: { shareHash: { equals: transfer.shareHash } },
        depth: 1,
        limit: 1,
        overrideAccess: true,
      })

      expect(docs.length).toBe(1)
      const recipientDoc = docs[0]
      expect(recipientDoc.filename).toBe('Presentation_Deck_Final.pdf')
      expect(recipientDoc.title).toBe('Final Client Deck')
      expect(recipientDoc.message).toBe('Please review before Friday')
      expect(typeof recipientDoc.sender).toBe('object')
      expect((recipientDoc.sender as any).id).toBe(testUserId)

      // Verify status determination logic
      const isRevoked = recipientDoc.status === 'revoked'
      const isExpired = new Date(recipientDoc.expiresAt).getTime() <= Date.now()
      expect(isRevoked).toBe(false)
      expect(isExpired).toBe(false)
    })

    it('correctly categorizes revoked transfer for recipient view', async () => {
      const transfer = await payload.create({
        draft: true,
        collection: 'transfers',
        data: {
          filename: 'Draft_To_Revoke.mov',
          filesize: 10485760,
          mimeType: 'video/quicktime',
          storagePath: `transfers/${testUserId}/tr_p4_rev/original/draft.mov`,
          status: 'revoked',
        },
        user: { id: testUserId } as any,
      })

      const { docs } = await payload.find({
        collection: 'transfers',
        where: { shareHash: { equals: transfer.shareHash } },
        depth: 1,
        limit: 1,
        overrideAccess: true,
      })

      expect(docs.length).toBe(1)
      expect(docs[0].status).toBe('revoked')
    })
  })
})


