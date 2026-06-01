import { notFound } from 'next/navigation'
import { auth } from '@/utilities/auth'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import type { Media, SmartCollection } from '@/payload-types'
import type { Where } from 'payload'
import { CollectionExpandedView } from '@/components/Collections/CollectionExpandedView'
import { extractCollectionChips } from '@/app/(dashboard)/actions/collections'

// FRH-47: Extended SmartCollection fields added in migration 20260527_120000_smart_collections_v2.
type SmartCollectionV2 = SmartCollection & {
  isSystemGenerated?: boolean
  isHidden?: boolean
  sortOrder?: number
  generatedFrom?: string
  coverAsset?: number | Media | null
  manualIncludes?: (number | Media)[]
  manualExcludes?: (number | Media)[]
  description?: string
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
    typeof collection.owner === 'object'
      ? (collection.owner as { id: number }).id
      : collection.owner
  if (!collection || ownerId !== user.id) notFound()

  const filterQuery = (collection.filterQuery as Record<string, unknown>) || {}
  const hasFilterQuery = Object.keys(filterQuery).length > 0

  const manualExcludeIds = ((collection.manualExcludes || []) as (Media | number)[])
    .map((m) => (typeof m === 'object' ? m.id : m))
    .filter(Boolean) as number[]

  const manualIncludeIds = ((collection.manualIncludes || []) as (Media | number)[])
    .map((m) => (typeof m === 'object' ? m.id : m))
    .filter(Boolean) as number[]

  const manualIncludeDocs = ((collection.manualIncludes || []) as (Media | number)[])
    .map((m) => (typeof m === 'object' ? m : null))
    .filter(Boolean) as Media[]

  const effectiveWhere: Where = {
    and: [
      { owner: { equals: user.id } },
      ...(hasFilterQuery ? [filterQuery as Where] : []),
      ...(manualExcludeIds.length > 0 ? [{ id: { not_in: manualExcludeIds } } as Where] : []),
    ],
  }

  const [{ docs: autoMedia, totalDocs: totalAutoCount }, chipData] = await Promise.all([
    payload.find({
      collection: 'media',
      where: effectiveWhere,
      sort: '-captureDate,-createdAt',
      limit: 48,
      depth: 0,
    }),
    extractCollectionChips(collection.id, filterQuery, manualExcludeIds),
  ])

  return (
    <CollectionExpandedView
      collectionId={collection.id}
      collectionName={collection.name}
      collectionIcon={collection.icon ?? undefined}
      isSystemGenerated={collection.isSystemGenerated ?? false}
      description={collection.description ?? undefined}
      updatedAt={collection.updatedAt ?? undefined}
      filterQuery={filterQuery}
      manualIncludeIds={manualIncludeIds}
      manualIncludeDocs={manualIncludeDocs}
      manualExcludeIds={manualExcludeIds}
      hasFilterQuery={hasFilterQuery}
      initialMedia={autoMedia as Media[]}
      initialTotalCount={totalAutoCount}
      chipData={chipData}
    />
  )
}
