import { notFound } from 'next/navigation'
import { auth } from '@/utilities/auth'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { MediaGrid } from '@/components/Gallery/MediaGrid'
import { CollectionDetailHeader } from '@/components/SmartCollections/CollectionDetailHeader'
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

// ─── Manual includes section ──────────────────────────────────────────────────

function ManualIncludesSection({ media }: { media: Media[] }) {
  if (!media.length) return null
  return (
    <section aria-label="Manually added assets" className="mb-8">
      <p className="text-[10px] tracking-widest font-medium text-[#1a1c1c]/40 uppercase mb-3">
        MANUALLY ADDED ({media.length.toLocaleString()})
      </p>
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {media.map((item) => {
          const src = item.thumbnailUrl || item.proxyUrl || item.originalUrl || item.url
          return (
            <div
              key={item.id}
              className="relative aspect-square rounded-[12px] overflow-hidden bg-[#eeeeee]"
            >
              {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={src}
                  alt={item.title || item.filename || ''}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#d5c4af] text-xs">
                  No preview
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

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

  // Manual include docs (fully populated via depth:1)
  const manualIncludeDocs = ((collection.manualIncludes || []) as (Media | number)[])
    .map((m) => (typeof m === 'object' ? m : null))
    .filter(Boolean) as Media[]

  // Effective WHERE for auto-matched assets (exclude manual excludes)
  const effectiveWhere: Where = {
    and: [
      { owner: { equals: user.id } },
      ...(hasFilterQuery ? [filterQuery as Where] : []),
      ...(manualExcludeIds.length > 0 ? [{ id: { not_in: manualExcludeIds } } as Where] : []),
    ],
  }

  // Fetch first page of auto-matched assets only — MediaGrid handles pagination
  const { docs: autoMedia, totalDocs: totalAutoCount } = await payload.find({
    collection: 'media',
    where: effectiveWhere,
    sort: '-captureDate,-createdAt',
    limit: 48,
    depth: 0,
  })

  // Collection data for header
  const rawFilterQuery = Object.keys(filterQuery).length > 0 ? filterQuery : null
  const collectionForHeader = {
    id: collection.id,
    name: collection.name,
    isSystemGenerated: collection.isSystemGenerated ?? false,
    isHidden: collection.isHidden ?? false,
    generatedFrom: collection.generatedFrom ?? 'manual',
    sortOrder: collection.sortOrder ?? 0,
    assetCount: totalAutoCount + manualIncludeIds.length,
    filterQuery: rawFilterQuery,
    hasManualOverrides: manualIncludeIds.length > 0 || manualExcludeIds.length > 0,
    updatedAt: collection.updatedAt,
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-180px)]">
      {/* Detail header with type icon, rule summary, edit actions */}
      <CollectionDetailHeader collection={collectionForHeader} />

      {/* Manual includes section — only shown when manually added assets exist */}
      <ManualIncludesSection media={manualIncludeDocs} />

      {/* Auto-matched section label */}
      {hasFilterQuery && (
        <p
          className="text-[10px] tracking-widest font-medium text-[#1a1c1c]/40 uppercase mb-3"
          aria-label={`Automatically matched assets: ${totalAutoCount.toLocaleString()}`}
        >
          AUTOMATICALLY MATCHED ({totalAutoCount.toLocaleString()})
        </p>
      )}

      {/* Auto-matched assets grid with pagination */}
      <MediaGrid
        initialMedia={autoMedia as Media[]}
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
