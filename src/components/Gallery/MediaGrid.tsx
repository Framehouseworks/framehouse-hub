'use client'

import React, { useEffect, useState } from 'react'
import { MediaCard } from './MediaCard'
import type { Media } from '@/payload-types'
import { useUpload } from '@/providers/UploadProvider'
import { useRouter } from 'next/navigation'

interface MediaGridProps {
  initialMedia: Media[]
}

export const MediaGrid: React.FC<MediaGridProps> = ({ initialMedia }) => {
  const { queue } = useUpload()
  const router = useRouter()
  const [localMedia, setLocalMedia] = useState<Media[]>(initialMedia)

  // Listen for queue completion to refresh the data
  useEffect(() => {
    const hasActiveUploads = queue.some(
      (item) => item.status === 'uploading' || item.status === 'pending',
    )

    if (!hasActiveUploads && queue.length > 0) {
      // In a real app, we might poll or use WebSockets.
      // For now, we'll trigger a router refresh to get fresh server data.
      router.refresh()
    }
  }, [queue, router])

  // Synchronize local state with initialMedia from server
  useEffect(() => {
    setLocalMedia(initialMedia)
  }, [initialMedia])

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {localMedia.map((item) => (
        <MediaCard key={item.id} media={item} />
      ))}
    </div>
  )
}
