import { auth } from '@/utilities/auth'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { MediaCard } from './MediaCard'

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
                equals: user.id
            }
        },
        sort: '-createdAt'
    })

    if (media.length === 0) {
        return (
            <div className="text-center py-12 border rounded-xl border-dashed">
                <h3 className="text-lg font-semibold">No media found</h3>
                <p className="text-muted-foreground">Upload your first photo in the admin panel to see it here.</p>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {media.map((item) => (
                <MediaCard key={item.id} media={item} />
            ))}
        </div>
    )
}
