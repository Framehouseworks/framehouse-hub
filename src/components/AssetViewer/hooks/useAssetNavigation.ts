'use client'

import { useState, useCallback, useEffect } from 'react'
import type { Media } from '@/payload-types'

export function useAssetNavigation(mediaList: Media[], openMedia: Media | null) {
  const [currentIndex, setCurrentIndex] = useState<number>(0)

  // Sync index whenever the externally-opened media changes (e.g. user clicked a different card)
  useEffect(() => {
    if (!openMedia) return
    const idx = mediaList.findIndex((m) => m.id === openMedia.id)
    setCurrentIndex(idx >= 0 ? idx : 0)
  }, [openMedia?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const currentMedia: Media | null = mediaList[currentIndex] ?? openMedia

  const goNext = useCallback(() => {
    setCurrentIndex((i) => (mediaList.length > 0 ? (i + 1) % mediaList.length : i))
  }, [mediaList.length])

  const goPrev = useCallback(() => {
    setCurrentIndex((i) =>
      mediaList.length > 0 ? (i - 1 + mediaList.length) % mediaList.length : i,
    )
  }, [mediaList.length])

  const canNavigate = mediaList.length > 1

  return { currentMedia, currentIndex, totalCount: mediaList.length, goNext, goPrev, canNavigate }
}
