'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
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

// Desktop heights — CSS clamps these for mobile (compact→160, comfortable→220, editorial→280)
const TRACK_HEIGHT: Record<string, number> = {
  compact: 240,
  comfortable: 360,
  editorial: 480,
}

const MIN_CARD_WIDTH = 160
// Max card width as fraction of viewport — applied via CSS clamp, not JS
const MAX_CARD_VW = 90

interface FilmstripRowProps {
  items: GridItem[]
  trackHeight?: string | null
  sectionName?: string | null
  /**
   * When provided, clicking a media item calls this instead of the internal
   * lightbox. The argument is the flat index within `items`.
   */
  onOpenLightbox?: (index: number) => void
}

/**
 * FilmstripRow — Client Component ('use client' required: scroll state + keyboard nav).
 * Horizontal scroll strip with aspect-ratio-aware card widths and pillar-boxing for
 * portrait assets. (C-6, §8.2)
 */
export function FilmstripRow({ items, trackHeight, sectionName, onOpenLightbox }: FilmstripRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [selectedImage, setSelectedImage] = useState<MediaType | null>(null)

  const trackPx = TRACK_HEIGHT[trackHeight ?? 'comfortable'] ?? TRACK_HEIGHT.comfortable
  // Mobile-responsive height: compact→160, comfortable→220, editorial→280
  const mobileCapPx = trackHeight === 'compact' ? 160 : trackHeight === 'editorial' ? 280 : 220

  const visibleItems = items.filter((item) => item.media && typeof item.media === 'object')

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    updateScrollState()
    el.addEventListener('scroll', updateScrollState, { passive: true })
    const ro = new ResizeObserver(updateScrollState)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', updateScrollState)
      ro.disconnect()
    }
  }, [updateScrollState, visibleItems.length])

  function scrollByCard(direction: 'left' | 'right') {
    const el = scrollRef.current
    if (!el) return
    const firstCard = el.querySelector('[data-filmstrip-card]') as HTMLElement | null
    const cardWidth = firstCard?.offsetWidth ?? 300
    el.scrollBy({ left: direction === 'right' ? cardWidth + 12 : -(cardWidth + 12), behavior: 'smooth' })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); scrollByCard('left') }
    if (e.key === 'ArrowRight') { e.preventDefault(); scrollByCard('right') }
  }

  if (visibleItems.length === 0) return null

  const ariaLabel = sectionName
    ? `${sectionName} filmstrip, ${visibleItems.length} items`
    : `Media filmstrip, ${visibleItems.length} items`

  return (
    <>
      <div
        className="relative w-full group/filmstrip"
        style={{ height: `clamp(${mobileCapPx}px, ${trackPx}px, ${trackPx}px)` }}
      >
        {/* Scroll container */}
        <div
          ref={scrollRef}
          role="region"
          aria-label={ariaLabel}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          className="flex flex-nowrap overflow-x-auto h-full gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7f5700] focus-visible:ring-offset-2"
          style={{
            scrollSnapType: 'x mandatory',
            overscrollBehaviorX: 'contain',
            scrollPaddingLeft: '16px',
            scrollbarWidth: 'none' as React.CSSProperties['scrollbarWidth'],
            WebkitOverflowScrolling: 'touch',
          } as React.CSSProperties}
        >
          {visibleItems.map((item, index) => {
            const media = item.media as MediaType
            const isVideo = media.mediaType === 'video'

            const rawW = Math.max(1, media.width ?? 16)
            const rawH = Math.max(1, media.height ?? 9)
            const ar = rawW / rawH
            const isPortrait = rawH > rawW

            // Card width derived from aspect ratio × track height; clamped
            const calculatedWidth = Math.round(trackPx * ar)
            const cardWidth = Math.max(MIN_CARD_WIDTH, calculatedWidth)

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

            const altText = item.instanceTitle ?? media.alt ?? media.title ?? media.filename ?? ''

            return (
              <article
                key={item.instanceId ?? item.id ?? index}
                data-filmstrip-card
                role="article"
                aria-label={altText || 'Media item'}
                className="relative flex-shrink-0 overflow-hidden group/card"
                style={{
                  width: `min(${cardWidth}px, ${MAX_CARD_VW}vw)`,
                  minWidth: MIN_CARD_WIDTH,
                  height: trackPx,
                  scrollSnapAlign: 'start',
                }}
              >
                {/* Pillar-box blurred backdrop for portrait assets (§8.2, EC-01) */}
                {isPortrait && src && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    aria-hidden="true"
                    style={{
                      backgroundImage: `url(${src})`,
                      backgroundSize: '200%',
                      backgroundPosition: 'center',
                      filter: 'blur(24px) saturate(0.3) brightness(0.6)',
                      transform: 'scale(1.1)',
                    }}
                  />
                )}

                <button
                  type="button"
                  className="relative block w-full h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7f5700] focus-visible:ring-inset"
                  onClick={() => {
                    if (isVideo) return
                    const globalIndex = items.indexOf(item)
                    if (onOpenLightbox) onOpenLightbox(globalIndex >= 0 ? globalIndex : index)
                    else setSelectedImage(media)
                  }}
                  aria-label={altText ? `View ${altText} fullscreen` : 'View fullscreen'}
                >
                  {src && (
                    <img
                      src={src}
                      alt={altText}
                      className="w-full h-full transition-transform duration-500 group-hover/card:scale-[1.02]"
                      style={{ objectFit: isPortrait ? 'contain' : 'cover' }}
                      loading={index < 3 ? 'eager' : 'lazy'}
                    />
                  )}

                  {/* Portrait letterbox inset (no border — box-shadow only per DESIGN.md) */}
                  {isPortrait && (
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{ boxShadow: 'inset 0 0 0 3px rgba(127, 87, 0, 0.4)' }}
                      aria-hidden="true"
                    />
                  )}

                  {/* Video play badge */}
                  {isVideo && (
                    <div
                      className="absolute inset-0 flex items-center justify-center pointer-events-none"
                      aria-hidden="true"
                    >
                      <div className="w-12 h-12 rounded-full bg-[#7f5700]/90 flex items-center justify-center">
                        <svg viewBox="0 0 12 14" className="w-4 h-4 fill-white ml-0.5" aria-hidden="true">
                          <polygon points="0,0 12,7 0,14" />
                        </svg>
                      </div>
                    </div>
                  )}

                  {/* Hover caption */}
                  {item.instanceTitle && (
                    <div className="absolute bottom-0 left-0 right-0 px-4 py-3 bg-gradient-to-t from-black/70 to-transparent translate-y-full group-hover/card:translate-y-0 transition-transform duration-200 pointer-events-none">
                      <p className="text-white text-[10px] tracking-widest uppercase truncate">
                        {item.instanceTitle}
                      </p>
                    </div>
                  )}
                </button>
              </article>
            )
          })}
        </div>

        {/* Prev/Next chevrons — visible only on hover + non-touch (md breakpoint proxy) */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scrollByCard('left')}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm text-white/80 hover:text-white hover:bg-black/80 transition-all hidden md:flex opacity-0 group-hover/filmstrip:opacity-100 z-10"
            aria-label="Scroll filmstrip left"
          >
            <svg viewBox="0 0 8 14" className="w-3 h-3 stroke-current stroke-[2] fill-none" strokeLinecap="round" aria-hidden="true">
              <polyline points="7,1 1,7 7,13" />
            </svg>
          </button>
        )}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => scrollByCard('right')}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm text-white/80 hover:text-white hover:bg-black/80 transition-all hidden md:flex opacity-0 group-hover/filmstrip:opacity-100 z-10"
            aria-label="Scroll filmstrip right"
          >
            <svg viewBox="0 0 8 14" className="w-3 h-3 stroke-current stroke-[2] fill-none" strokeLinecap="round" aria-hidden="true">
              <polyline points="1,1 7,7 1,13" />
            </svg>
          </button>
        )}
      </div>

      <Lightbox
        image={selectedImage}
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
      />
    </>
  )
}
