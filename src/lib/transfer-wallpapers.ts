import type { Payload } from 'payload'
import type { TransferWallpaper } from '@/payload-types'
import { FALLBACK_TRANSFER_WALLPAPER } from '@/components/Transfers/TransferWallpaperCanvas/types'

/**
 * Retrieves all currently active and scheduled transfer wallpapers via Payload Local API.
 * Uses compound server-side filtering:
 * - status = 'active'
 * - startDate <= now
 * - endDate is null OR endDate >= now
 *
 * Results are sorted by weight descending (highest priority first).
 * If no documents match, returns a deterministic curated fallback array.
 */
export async function getActiveTransferWallpapers(payload: Payload): Promise<TransferWallpaper[]> {
  const now = new Date().toISOString()

  try {
    const { docs } = await payload.find({
      collection: 'transfer-wallpapers',
      where: {
        and: [
          {
            status: {
              equals: 'active',
            },
          },
          {
            startDate: {
              less_than_equal: now,
            },
          },
          {
            or: [
              {
                endDate: {
                  exists: false,
                },
              },
              {
                endDate: {
                  greater_than_equal: now,
                },
              },
            ],
          },
        ],
      },
      sort: '-weight',
      limit: 20,
      overrideAccess: true,
    })

    if (docs && docs.length > 0) {
      return docs as TransferWallpaper[]
    }
  } catch (error) {
    // Graceful fallback on query failure or table absence
    console.warn('[TransferWallpapers] Failed to query active wallpapers, using fallback:', error)
  }

  return [FALLBACK_TRANSFER_WALLPAPER]
}
