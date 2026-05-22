import { auth } from '@/utilities/auth'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { EmptyState } from './EmptyState'
import { MediaGrid } from './MediaGrid'
import { searchMediaByQuery } from '@/lib/searchMedia'

export const Gallery = async ({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined }
}) => {
  const user = await auth()

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Please log in to view your media.</p>
      </div>
    )
  }

  const payload = await getPayload({ config: configPromise })

  const viewId = searchParams?.view as string
  let initialFilters: { search?: string; status?: string } = {}

  if (viewId) {
    try {
      const collection = await payload.findByID({
        collection: 'smart-collections',
        id: viewId,
      })
      if (collection && collection.filterQuery) {
        initialFilters = collection.filterQuery as { search?: string; status?: string }
      }
    } catch (_e) {
      // View not found, ignore
    }
  }

  // Override with direct search param if present
  if (searchParams?.search) {
    initialFilters.search = searchParams.search as string
  }

  const searchQuery = initialFilters.search?.trim()
  let media
  if (searchQuery) {
    media = await searchMediaByQuery(payload, user.id, searchQuery)
  } else {
    const result = await payload.find({
      collection: 'media',
      where: { owner: { equals: user.id } },
      sort: '-captureDate,-createdAt',
      limit: 1000,
    })
    media = result.docs
  }

  const gridKey = `${viewId || 'all'}-${searchParams?.search || 'none'}`

  if (media.length === 0) {
    // Active search with no matches → "no results" state, not the ingest CTA
    if (searchQuery) {
      return <MediaGrid key={gridKey} initialMedia={[]} initialFilters={initialFilters} />
    }
    return <EmptyState />
  }

  return <MediaGrid key={gridKey} initialMedia={media} initialFilters={initialFilters} />
}
