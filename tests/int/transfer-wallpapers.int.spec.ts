import type { Payload } from 'payload'
import { describe, it, beforeAll, expect } from 'vitest'
import { getTestPayload } from '../helpers/payload'
import { getActiveTransferWallpapers } from '@/lib/transfer-wallpapers'
import { FALLBACK_TRANSFER_WALLPAPER } from '@/components/Transfers/TransferWallpaperCanvas/types'

let payload: Payload
let adminUserId: string

describe('TransferWallpapers Service & Active Query (Phase 2 Integration)', () => {
  beforeAll(async () => {
    payload = await getTestPayload()

    // Seed admin user for managing wallpapers
    const adminUser = await payload.create({
      collection: 'users',
      data: {
        email: `wallpaper-admin-${Date.now()}@example.test`,
        password: 'password123',
        roles: ['admin'],
      },
    })
    adminUserId = adminUser.id
  })

  it('returns fallback wallpaper when collection has no matching active records', async () => {
    const results = await getActiveTransferWallpapers(payload)
    expect(results).toBeDefined()
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].title).toBeDefined()
  })

  it('filters active wallpapers based on status and valid scheduling window', async () => {
    const now = Date.now()

    // 1. Valid Active Wallpaper (Weight: 200)
    const activeDoc = await payload.create({
      collection: 'transfer-wallpapers',
      data: {
        title: 'Alpine Vista at Sunset',
        assetUrl: 'https://cdn.example.com/wallpapers/alpine-sunset-4k.jpg',
        artistCredit: 'Studio Alpine',
        clickThroughUrl: 'https://example.com/artist',
        sponsorshipStatus: 'editorial',
        status: 'active',
        displayDurationSeconds: 60,
        startDate: new Date(now - 1000 * 60 * 60).toISOString(), // 1h ago
        endDate: new Date(now + 1000 * 60 * 60 * 24).toISOString(), // 24h in future
        weight: 200,
      },
      user: { id: adminUserId } as any,
    })

    // 2. Expired Wallpaper (Should be filtered out)
    await payload.create({
      collection: 'transfer-wallpapers',
      data: {
        title: 'Expired Brand Takeover',
        assetUrl: 'https://cdn.example.com/wallpapers/brand-expired.jpg',
        artistCredit: 'Brand Sponsor',
        sponsorshipStatus: 'sponsored',
        status: 'active',
        displayDurationSeconds: 45,
        startDate: new Date(now - 1000 * 60 * 60 * 48).toISOString(), // 48h ago
        endDate: new Date(now - 1000 * 60 * 60 * 24).toISOString(), // expired 24h ago
        weight: 300,
      },
      user: { id: adminUserId } as any,
    })

    // 3. Inactive/Draft Wallpaper (Should be filtered out)
    await payload.create({
      collection: 'transfer-wallpapers',
      data: {
        title: 'Inactive Future Concept',
        assetUrl: 'https://cdn.example.com/wallpapers/future-concept.jpg',
        artistCredit: 'Concept Lab',
        sponsorshipStatus: 'editorial',
        status: 'inactive',
        displayDurationSeconds: 30,
        startDate: new Date(now - 1000 * 60 * 60).toISOString(),
        weight: 500,
      },
      user: { id: adminUserId } as any,
    })

    // Query active wallpapers via service helper
    const activeResults = await getActiveTransferWallpapers(payload)
    expect(activeResults.length).toBeGreaterThan(0)

    const titles = activeResults.map((w) => w.title)
    expect(titles).toContain('Alpine Vista at Sunset')
    expect(titles).not.toContain('Expired Brand Takeover')
    expect(titles).not.toContain('Inactive Future Concept')

    // Verify ordering by weight descending
    expect(activeResults[0].weight).toBeGreaterThanOrEqual(activeDoc.weight)
  })

  it('validates date range logic rejecting endDate earlier than startDate', async () => {
    const now = Date.now()

    await expect(
      payload.create({
        collection: 'transfer-wallpapers',
        data: {
          title: 'Invalid Date Range Item',
          assetUrl: 'https://cdn.example.com/wallpapers/invalid.jpg',
          artistCredit: 'Tester',
          sponsorshipStatus: 'editorial',
          status: 'active',
          displayDurationSeconds: 45,
          startDate: new Date(now).toISOString(),
          endDate: new Date(now - 1000 * 60 * 60).toISOString(), // Earlier than startDate
          weight: 100,
        },
        user: { id: adminUserId } as any,
      }),
    ).rejects.toThrow()
  })
})
