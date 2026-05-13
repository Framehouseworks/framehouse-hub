import { auth } from '@/utilities/auth'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { EmptyState } from './EmptyState'
import { GalleryHeader } from './GalleryHeader'
import { MediaGrid } from './MediaGrid'

export const Gallery = async () => {
  const user = await auth()

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Please log in to view your media.</p>
      </div>
    )
  }

  const payload = await getPayload({ config: configPromise })

  const { docs: media } = await payload.find({
    collection: 'media',
    where: {
      owner: {
        equals: user.id,
      },
    },
    sort: '-createdAt',
  })

  if (media.length === 0) {
    return <EmptyState />
  }

  return (
    <>
      <GalleryHeader />
      <MediaGrid initialMedia={media} />
    </>
  )
}
