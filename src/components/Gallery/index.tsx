import { auth } from '@/utilities/auth'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { EmptyState } from './EmptyState'
import { MediaGrid } from './MediaGrid'

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

  const { docs: media } = await payload.find({
    collection: 'media',
    where: {
      owner: {
        equals: user.id,
      },
    },
    sort: '-captureDate,-createdAt',
    limit: 1000, // Reasonable limit for initial batch
  })

  if (media.length === 0) {
    return <EmptyState />
  }

  // Generate a key based on active filters to reset MediaGrid state upon navigation
  const gridKey = `${viewId || 'all'}-${searchParams?.search || 'none'}`

  return (
    <>
      <MediaGrid key={gridKey} initialMedia={media} initialFilters={initialFilters} />
    </>
  )
}
