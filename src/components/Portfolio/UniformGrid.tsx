'use client'

import React, { useState } from 'react'
import type { Media as MediaType, Portfolio } from '@/payload-types'
import { Lightbox } from './Lightbox'

type GridItem = NonNullable<
  NonNullable<Extract<NonNullable<Portfolio['layoutBlocks']>[number], { blockType: 'grid' }>['items']>
>[number] & {
  instanceTitle?: string | null
  focalPoint?: { x?: number | null; y?: number | null } | null
  videoThumbnail?: {
    mode?: ('auto' | 'timecode' | 'custom') | null
    timecodeSeconds?: number | null
    customMedia?: (number | null) | MediaType
  } | null
}

interface UniformGridProps {
  items: GridItem[]
  /** Payload select value — parseInt() applied internally. (C-4) */
  columns?: string | null
  spacing?: string | null
}

const GAP: Record<string, string> = {
  small: 'gap-1',
  medium: 'gap-2 md:gap-3',
  large: 'gap-3 md:gap-5',
  none: 'gap-0',
}

const COL_CLASSES: Record<number, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
}

/**
 * UniformGrid — Client Component (mirrors MasonryGrid pattern for lightbox state).
 * Renders a CSS grid with uniform 1:1 cells and focalPoint-aware object-position.
 * (C-4) uniformGridColumns is a Payload string select — parseInt() applied here.
 */
export function UniformGrid({ items, columns, spacing }: UniformGridProps) {
  const [selectedImage, setSelectedImage] = useState<MediaType | null>(null)

  // Reset lightbox if the visible items list changes (Issue-15: stale lightbox on remount)
  const visibleCount = items.filter((item) => item.media && typeof item.media === 'object').length
  React.useEffect(() => { setSelectedImage(null) }, [visibleCount])

  // C-4: Payload select values are strings — parseInt required
  const cols = Math.min(4, Math.max(2, parseInt(columns ?? '3', 10)))
  const colClass = COL_CLASSES[cols] ?? COL_CLASSES[3]
  const gapClass = GAP[spacing ?? 'medium'] ?? GAP.medium

  const visibleItems = items.filter((item) => item.media && typeof item.media === 'object')

  if (visibleItems.length === 0) return null

  return (
    <>
      <div
        className={`grid ${colClass} ${gapClass} w-full`}
        role="list"
        aria-label="Media grid"
      >
        {visibleItems.map((item, index) => {
          const media = item.media as MediaType
          const isVideo = media.mediaType === 'video'

          const posterUrl: string | undefined = isVideo
            ? item.videoThumbnail?.mode === 'custom' &&
              item.videoThumbnail.customMedia &&
              typeof item.videoThumbnail.customMedia === 'object'
              ? (item.videoThumbnail.customMedia as MediaType).thumbnailUrl ?? undefined
              : media.thumbnailUrl ?? undefined
            : undefined

          const src = isVideo
            ? (posterUrl ?? media.thumbnailUrl ?? media.url ?? undefined)
            : (media.thumbnailUrl ?? media.proxyUrl ?? media.originalUrl ?? media.url ?? undefined)

          const fpX = item.focalPoint?.x ?? 50
          const fpY = item.focalPoint?.y ?? 50

          return (
            <div
              key={item.instanceId ?? item.id ?? index}
              role="listitem"
              className="relative aspect-square overflow-hidden rounded-2xl bg-[#0a0a0a] group"
            >
              <button
                type="button"
                className="block w-full h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7f5700] focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-2xl"
                onClick={() => !isVideo && setSelectedImage(media)}
                aria-label={`View ${item.instanceTitle ?? media.alt ?? media.title ?? 'image'} fullscreen`}
              >
                {src && (
                  <img
                    src={src}
                    alt={item.instanceTitle ?? media.alt ?? media.title ?? media.filename ?? ''}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    style={{ objectPosition: `${fpX}% ${fpY}%` }}
                    loading={index < 6 ? 'eager' : 'lazy'}
                  />
                )}

                {isVideo && (
                  <div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    aria-hidden="true"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#7f5700]/90 flex items-center justify-center">
                      <svg viewBox="0 0 12 14" className="w-3.5 h-3.5 fill-white ml-0.5" aria-hidden="true">
                        <polygon points="0,0 12,7 0,14" />
                      </svg>
                    </div>
                  </div>
                )}

                {item.instanceTitle && (
                  <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/70 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-200 pointer-events-none">
                    <p className="text-white text-[10px] tracking-widest uppercase truncate">
                      {item.instanceTitle}
                    </p>
                  </div>
                )}
              </button>
            </div>
          )
        })}
      </div>

      <Lightbox
        image={selectedImage}
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
      />
    </>
  )
}
