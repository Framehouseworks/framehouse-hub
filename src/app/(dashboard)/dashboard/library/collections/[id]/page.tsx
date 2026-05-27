import { notFound } from 'next/navigation'
import { auth } from '@/utilities/auth'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { CollectionDetailHeader } from '@/components/SmartCollections/CollectionDetailHeader'
import { MediaGrid } from '@/components/Gallery/MediaGrid'
import type { Media, SmartCollection } from '@/payload-types'
import type { Where } from 'payload'

// FRH-47: Extended SmartCollection fields added in migration 20260527_120000_smart_collections_v2.
// payload-types.ts will be regenerated after migration runs; until then, use this extension.
type SmartCollectionV2 = SmartCollection & {
  isSystemGenerated?: boolean
  isHidden?: boolean
  sortOrder?: number
  generatedFrom?: string
  coverAsset?: number | Media | null
  manualIncludes?: (number | Media)[]
  manualExcludes?: (number | Media)[]
}

export const dynamic = 'force-dynamic'

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await auth()
  if (!user) notFound()

  const payload = await getPayload({ config: configPromise })

  let collection: SmartCollectionV2
  try {
    collection = (await payload.findByID({
      collection: 'smart-collections',
      id: Number(id),
      depth: 1,
    })) as unknown as SmartCollectionV2
  } catch {
    notFound()
  }

  const ownerId =
    typeof collection.owner === 'object' ? (collection.owner as { id: number }).id : collection.owner
  if (!collection || ownerId !== user.id) {
    notFound()
  }

  const filterQuery = (collection.filterQuery as Record<string, unknown>) || {}

  // Build excludes from manualExcludes
  const manualExcludeIds = ((collection.manualExcludes || []) as (Media | number)[])
    .map((m) => (typeof m === 'object' ? m.id : m))
    .filter(Boolean) as number[]

  const effectiveWhere: Where = {
    and: [
      { owner: { equals: user.id } },
      filterQuery as Where,
      ...(manualExcludeIds.length > 0 ? [{ id: { not_in: manualExcludeIds } } as Where] : []),
    ],
  }

  // Fetch media matching the effective query
  const { docs: media, totalDocs: assetCount } = await payload.find({
    collection: 'media',
    where: effectiveWhere,
    sort: '-captureDate,-createdAt',
    limit: 1000,
    depth: 0,
  })

  // Fetch manualIncludes and prepend
  const manualIncludeDocs = ((collection.manualIncludes || []) as (Media | number)[])
    .map((m) => (typeof m === 'object' ? m : null))
    .filter(Boolean) as Media[]

  const alreadyInResults = new Set(media.map((m) => m.id))
  const prependedIncludes = manualIncludeDocs.filter((m) => !alreadyInResults.has(m.id))
  const allMedia = [...prependedIncludes, ...media] as Media[]

  const collectionData = {
    id: collection.id,
    name: collection.name,
    isSystemGenerated: collection.isSystemGenerated ?? false,
    isHidden: collection.isHidden ?? false,
    generatedFrom: collection.generatedFrom ?? 'manual',
    sortOrder: collection.sortOrder ?? 0,
    assetCount: assetCount + prependedIncludes.length,
    updatedAt: collection.updatedAt,
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-180px)]">
      <CollectionDetailHeader collection={collectionData} />
      <div className="flex-1 flex flex-col">
        <MediaGrid initialMedia={allMedia} />
      </div>
    </div>
  )
}
