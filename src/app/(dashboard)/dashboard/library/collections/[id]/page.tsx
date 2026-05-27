import { notFound } from 'next/navigation'
import { auth } from '@/utilities/auth'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { MediaGrid } from '@/components/Gallery/MediaGrid'
import type { Media, SmartCollection } from '@/payload-types'
import type { Where } from 'payload'

// FRH-47: Extended SmartCollection fields added in migration 20260527_120000_smart_collections_v2.
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
  if (!collection || ownerId !== user.id) notFound()

  const filterQuery = (collection.filterQuery as Record<string, unknown>) || {}

  const manualExcludeIds = ((collection.manualExcludes || []) as (Media | number)[])
    .map((m) => (typeof m === 'object' ? m.id : m))
    .filter(Boolean) as number[]

  const manualIncludeIds = ((collection.manualIncludes || []) as (Media | number)[])
    .map((m) => (typeof m === 'object' ? m.id : m))
    .filter(Boolean) as number[]

  const effectiveWhere: Where = {
    and: [
      { owner: { equals: user.id } },
      filterQuery as Where,
      ...(manualExcludeIds.length > 0 ? [{ id: { not_in: manualExcludeIds } } as Where] : []),
    ],
  }

  const { docs: media } = await payload.find({
    collection: 'media',
    where: effectiveWhere,
    sort: '-captureDate,-createdAt',
    limit: 1000,
    depth: 0,
  })

  // Prepend manual includes not already in results
  const manualIncludeDocs = ((collection.manualIncludes || []) as (Media | number)[])
    .map((m) => (typeof m === 'object' ? m : null))
    .filter(Boolean) as Media[]

  const alreadyInResults = new Set(media.map((m) => m.id))
  const prependedIncludes = manualIncludeDocs.filter((m) => !alreadyInResults.has(m.id))
  const allMedia = [...prependedIncludes, ...media] as Media[]

  return (
    <div className="flex flex-col min-h-[calc(100vh-180px)]">
      <MediaGrid
        initialMedia={allMedia}
        collectionContext={{
          id: collection.id,
          name: collection.name,
          isSystemGenerated: collection.isSystemGenerated ?? false,
          manualIncludeIds,
        }}
      />
    </div>
  )
}
