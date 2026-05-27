import { auth } from '@/utilities/auth'
import { getPayload } from 'payload'
import type { Where } from 'payload'
import configPromise from '@payload-config'
import { CollectionsGrid } from './CollectionsGrid'
import type { CollectionCardData } from './CollectionCard'
import type { Media, SmartCollection } from '@/payload-types'

// FRH-47: Extended type until payload-types.ts is regenerated post-migration.
type SmartCollectionV2 = SmartCollection & {
  isSystemGenerated?: boolean
  isHidden?: boolean
  sortOrder?: number
  generatedFrom?: string
  coverAsset?: number | Media | null
}

async function enrichCollections(
  collections: SmartCollectionV2[],
  userId: number | string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any,
): Promise<CollectionCardData[]> {
  return Promise.all(
    collections.map(async (col) => {
      const filterQuery = (col.filterQuery as Record<string, unknown>) || {}
      let assetCount = 0
      let thumbnails: string[] = []

      try {
        const { totalDocs } = await payload.find({
          collection: 'media',
          where: {
            and: [{ owner: { equals: userId } } as Where, filterQuery as Where],
          },
          limit: 0,
          depth: 0,
        })
        assetCount = totalDocs

        if (assetCount > 0) {
          const { docs: thumbDocs } = await payload.find({
            collection: 'media',
            where: {
              and: [{ owner: { equals: userId } } as Where, filterQuery as Where],
            },
            limit: 4,
            sort: '-captureDate',
            depth: 0,
            select: { thumbnailUrl: true, proxyUrl: true, originalUrl: true, url: true },
          })
          thumbnails = thumbDocs.map(
            (d: Media) =>
              d.thumbnailUrl || d.proxyUrl || d.originalUrl || d.url || '',
          )
        }
      } catch {
        // count stays 0
      }

      const coverAsset = col.coverAsset
        ? {
            url: (col.coverAsset as unknown as Media).url || '',
            thumbnailUrl: (col.coverAsset as unknown as Media).thumbnailUrl || '',
          }
        : null

      return {
        id: col.id,
        name: col.name,
        isSystemGenerated: col.isSystemGenerated ?? false,
        isHidden: col.isHidden ?? false,
        generatedFrom: col.generatedFrom ?? 'manual',
        sortOrder: col.sortOrder ?? 0,
        assetCount,
        thumbnails,
        coverAsset,
      } satisfies CollectionCardData
    }),
  )
}

export const SmartCollectionsView = async () => {
  const user = await auth()
  if (!user) return null

  const payload = await getPayload({ config: configPromise })

  // Fetch visible and hidden collections in parallel
  const [{ docs: visible }, { docs: hidden }] = await Promise.all([
    payload.find({
      collection: 'smart-collections',
      where: { and: [{ owner: { equals: user.id } }, { isHidden: { equals: false } }] },
      sort: ['-sortOrder', '-createdAt'],
      limit: 24,
      depth: 1,
    }),
    payload.find({
      collection: 'smart-collections',
      where: { and: [{ owner: { equals: user.id } }, { isHidden: { equals: true } }] },
      sort: '-createdAt',
      limit: 24,
      depth: 1,
    }),
  ])

  const [enrichedVisible, enrichedHidden] = await Promise.all([
    enrichCollections(visible as unknown as SmartCollectionV2[], user.id, payload),
    enrichCollections(hidden as unknown as SmartCollectionV2[], user.id, payload),
  ])

  return (
    <CollectionsGrid
      collections={enrichedVisible}
      hiddenCollections={enrichedHidden}
    />
  )
}
