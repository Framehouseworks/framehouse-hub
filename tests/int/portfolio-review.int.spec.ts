import type { Payload } from 'payload'
import { describe, it, beforeAll, expect } from 'vitest'
import { getTestPayload } from '../helpers/payload'

let payload: Payload
let portfolioId: number
let ownerId: number
let mediaId: number

describe('Portfolio Review Portal', () => {
  beforeAll(async () => {
    payload = await getTestPayload()

    // Create test owner
    const owner = await payload.create({
      collection: 'users',
      data: {
        email: `review-test-${Date.now()}@test.com`,
        password: 'password123',
        name: 'Test Creative',
        roles: ['creative'],
      },
      overrideAccess: true,
    })
    ownerId = owner.id

    // Create a test media item
    const media = await payload.create({
      collection: 'media',
      data: {
        title: 'Test Asset',
        alt: 'Test',
        ingestionStatus: 'ready',
        owner: ownerId,
        mediaType: 'image',
      },
      overrideAccess: true,
    })
    mediaId = media.id

    const minimalTitle = {
      root: {
        type: 'root',
        children: [{ type: 'paragraph', children: [{ type: 'text', text: 'Test Portfolio', version: 1 }], direction: 'ltr', format: '', indent: 0, version: 1 }],
        direction: 'ltr',
        format: '',
        indent: 0,
        version: 1,
      },
    }

    // Create a published portfolio with review enabled
    const portfolio = await payload.create({
      collection: 'portfolios',
      data: {
        name: 'Test Review Portfolio',
        title: minimalTitle,
        owner: ownerId,
        visibility: 'public',
        layoutBlocks: [
          {
            blockType: 'grid',
            items: [{ media: mediaId, size: 'medium' }],
            spacing: 'medium',
          },
        ],
        clientReviewSettings: {
          allowSelection: true,
          allowComments: true,
          allowDownload: false,
          requireClientIdentification: false,
          selectionLimit: 5,
          downloadQuality: 'proxy',
        },
      },
      draft: false,
      overrideAccess: true,
    })
    portfolioId = portfolio.id
  })

  describe('PortfolioClientSessions collection', () => {
    it('can create a session', async () => {
      const session = await payload.create({
        collection: 'portfolio-client-sessions',
        data: {
          portfolio: portfolioId,
          sessionToken: `test-token-${Date.now()}`,
          isIdentified: false,
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
        },
        overrideAccess: true,
      })
      expect(session.id).toBeDefined()
      const portfolioRef = typeof session.portfolio === 'object' ? session.portfolio.id : session.portfolio
      expect(portfolioRef).toBe(portfolioId)
      expect(session.isIdentified).toBe(false)
    })

    it('enforces unique session token', async () => {
      const token = `unique-token-${Date.now()}`
      await payload.create({
        collection: 'portfolio-client-sessions',
        data: {
          portfolio: portfolioId,
          sessionToken: token,
          isIdentified: false,
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
        },
        overrideAccess: true,
      })

      await expect(
        payload.create({
          collection: 'portfolio-client-sessions',
          data: {
            portfolio: portfolioId,
            sessionToken: token,
            isIdentified: false,
            expiresAt: new Date(Date.now() + 86400000).toISOString(),
          },
          overrideAccess: true,
        }),
      ).rejects.toThrow()
    })
  })

  describe('PortfolioClientReviews collection', () => {
    let sessionId: number

    beforeAll(async () => {
      const session = await payload.create({
        collection: 'portfolio-client-sessions',
        data: {
          portfolio: portfolioId,
          sessionToken: `review-test-token-${Date.now()}`,
          clientName: 'Jane Client',
          isIdentified: true,
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
        },
        overrideAccess: true,
      })
      sessionId = session.id
    })

    it('can create a review with selected items', async () => {
      const review = await payload.create({
        collection: 'portfolio-client-reviews',
        data: {
          portfolio: portfolioId,
          clientSession: sessionId,
          clientName: 'Jane Client',
          status: 'submitted',
          selectedItems: [
            { media: mediaId, instanceId: 'test-instance', instanceTitle: 'Test Asset' },
          ],
          itemCount: 1,
          submittedAt: new Date().toISOString(),
        },
        overrideAccess: true,
      })
      expect(review.id).toBeDefined()
      expect(review.status).toBe('submitted')
      expect(review.itemCount).toBe(1)
    })

    it('can acknowledge a review', async () => {
      const review = await payload.create({
        collection: 'portfolio-client-reviews',
        data: {
          portfolio: portfolioId,
          clientSession: sessionId,
          clientName: 'Bob Client',
          status: 'submitted',
          selectedItems: [{ media: mediaId }],
          itemCount: 1,
          submittedAt: new Date().toISOString(),
        },
        overrideAccess: true,
      })

      const updated = await payload.update({
        collection: 'portfolio-client-reviews',
        id: review.id,
        data: {
          status: 'acknowledged',
          acknowledgedAt: new Date().toISOString(),
        },
        overrideAccess: true,
      })
      expect(updated.status).toBe('acknowledged')
    })
  })

  describe('PortfolioAssetComments collection', () => {
    it('can create and read a comment', async () => {
      const comment = await payload.create({
        collection: 'portfolio-asset-comments',
        data: {
          portfolio: portfolioId,
          media: mediaId,
          clientName: 'Test Client',
          body: 'Love this image!',
          status: 'visible',
        },
        overrideAccess: true,
      })
      expect(comment.id).toBeDefined()
      expect(comment.body).toBe('Love this image!')
      expect(comment.status).toBe('visible')

      // Read back
      const fetched = await payload.findByID({
        collection: 'portfolio-asset-comments',
        id: comment.id,
        overrideAccess: true,
      })
      expect(fetched.body).toBe('Love this image!')
    })

    it('can resolve a comment', async () => {
      const comment = await payload.create({
        collection: 'portfolio-asset-comments',
        data: {
          portfolio: portfolioId,
          media: mediaId,
          clientName: 'Test Client',
          body: 'Needs adjustment',
          status: 'visible',
        },
        overrideAccess: true,
      })

      const resolved = await payload.update({
        collection: 'portfolio-asset-comments',
        id: comment.id,
        data: { status: 'resolved', resolvedAt: new Date().toISOString() },
        overrideAccess: true,
      })
      expect(resolved.status).toBe('resolved')
    })
  })

  describe('PortfolioDownloadLogs collection', () => {
    it('can create a download log', async () => {
      const log = await payload.create({
        collection: 'portfolio-download-logs',
        data: {
          portfolio: portfolioId,
          clientName: 'Test Client',
          downloadedItems: [{ media: mediaId }],
          itemCount: 1,
          quality: 'proxy',
          zipFilename: 'test_portfolio_2026-06-02_1_assets.zip',
          downloadedAt: new Date().toISOString(),
        },
        overrideAccess: true,
      })
      expect(log.id).toBeDefined()
      expect(log.quality).toBe('proxy')
      expect(log.itemCount).toBe(1)
    })
  })

  describe('Portfolio clientReviewSettings', () => {
    it('portfolio has clientReviewSettings fields', async () => {
      const p = await payload.findByID({
        collection: 'portfolios',
        id: portfolioId,
        overrideAccess: true,
      })
      expect(p.clientReviewSettings?.allowSelection).toBe(true)
      expect(p.clientReviewSettings?.allowComments).toBe(true)
      expect(p.clientReviewSettings?.allowDownload).toBe(false)
      expect(p.clientReviewSettings?.selectionLimit).toBe(5)
    })

    it('can update review settings', async () => {
      const updated = await payload.update({
        collection: 'portfolios',
        id: portfolioId,
        data: {
          clientReviewSettings: {
            allowSelection: true,
            allowComments: true,
            allowDownload: true,
            requireClientIdentification: true,
            selectionLimit: 10,
            downloadQuality: 'proxy',
            reviewMessage: 'Please select your favourites',
          },
        },
        overrideAccess: true,
      })
      expect(updated.clientReviewSettings?.allowDownload).toBe(true)
      expect(updated.clientReviewSettings?.selectionLimit).toBe(10)
      expect(updated.clientReviewSettings?.reviewMessage).toBe('Please select your favourites')
    })
  })
})
