'use client'

import { Media as MediaType, Portfolio } from '@/payload-types'
import React, { useMemo, useState, useEffect } from 'react'
import { Lightbox } from './Lightbox'
import { MotionContainer } from './MotionContainer'

type GridItem = NonNullable<NonNullable<Extract<NonNullable<Portfolio['layoutBlocks']>[number], { blockType: 'grid' }>['items']>>[number] & {
    alt?: string | null
    caption?: string | null
    link?: string | null
    instanceTitle?: string | null
    focalPoint?: { x?: number | null; y?: number | null } | null
    videoThumbnail?: {
        mode?: ('auto' | 'timecode' | 'custom') | null
        timecodeSeconds?: number | null
        customMedia?: (number | null) | MediaType
    } | null
}

interface MasonryGridProps {
    items: GridItem[]
    spacing?: 'small' | 'medium' | 'large' | 'none'
    /** When true, images show at natural proportions (CSS columns masonry) instead of justified rows */
    preserveAspectRatio?: boolean
    /**
     * When provided, clicking a media item calls this instead of the internal
     * lightbox. The argument is the flat index within `items`.
     */
    onOpenLightbox?: (index: number) => void
}

type Strip = {
    items: GridItem[]
    totalWeight: number
    id: string
}

const SIZE_WEIGHTS = { small: 0.7, medium: 1.0, large: 2.0, full: 4.0 }

// Fixed row heights for justified row layout — avoids flex+aspect-ratio height collapse bugs
const ROW_HEIGHT: Record<string, number> = { none: 240, small: 260, medium: 320, large: 420 }
const ROW_GAP: Record<string, number> = { none: 0, small: 4, medium: 8, large: 12 }
const ITEM_GAP: Record<string, number> = { none: 0, small: 3, medium: 6, large: 10 }
const MOBILE_ITEM_GAP: Record<string, number> = { none: 0, small: 8, medium: 12, large: 16 }

const WEIGHT_THRESHOLD = 3.0

export const MasonryGrid: React.FC<MasonryGridProps> = ({ items, spacing = 'medium', preserveAspectRatio = false, onOpenLightbox }) => {
    const [selectedImage, setSelectedImage] = useState<MediaType | null>(null)
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 640)
        check()
        window.addEventListener('resize', check)
        return () => window.removeEventListener('resize', check)
    }, [])

    const rowHeight = ROW_HEIGHT[spacing] ?? 320
    const rowGap = ROW_GAP[spacing] ?? 8
    const itemGap = ITEM_GAP[spacing] ?? 6
    const mobileGap = MOBILE_ITEM_GAP[spacing] ?? 12

    const strips = useMemo(() => {
        const result: Strip[] = []
        let currentStrip: GridItem[] = []
        let currentWeight = 0

        const flushStrip = () => {
            if (currentStrip.length > 0) {
                result.push({
                    items: [...currentStrip],
                    totalWeight: currentWeight,
                    id: `strip-${result.length}`,
                })
                currentStrip = []
                currentWeight = 0
            }
        }

        items.forEach((item) => {
            const size = (item.size || 'medium') as keyof typeof SIZE_WEIGHTS
            const weightMultiplier = SIZE_WEIGHTS[size] ?? 1.0
            const media = item.media as MediaType
            const ar = media?.width && media?.height ? media.width / media.height : 1.5
            const weight = weightMultiplier * ar

            if (size === 'full') {
                flushStrip()
                result.push({ items: [item], totalWeight: 4.0, id: `full-${result.length}` })
                return
            }

            if (currentWeight > 0 && currentWeight + weight * 0.7 > WEIGHT_THRESHOLD) {
                flushStrip()
            }

            currentStrip.push(item)
            currentWeight += weight
        })

        flushStrip()
        return result
    }, [items])

    // Preserve aspect ratio mode: CSS columns layout — images at natural proportions, no cropping
    if (preserveAspectRatio) {
        const colGap = ITEM_GAP[spacing] ?? 6
        const colCount = isMobile ? 2 : 3
        return (
            <div style={{ columns: colCount, columnGap: `${colGap}px` }}>
                {items.map((item, i) => {
                    const media = item.media as MediaType
                    if (!media) return null
                    const fpX = item.focalPoint?.x ?? 50
                    const fpY = item.focalPoint?.y ?? 50
                    const isVideo = media.mediaType === 'video'
                    const displayName = item.instanceTitle || item.caption || null
                    const posterUrl = isVideo
                        ? item.videoThumbnail?.mode === 'custom' &&
                          item.videoThumbnail.customMedia &&
                          typeof item.videoThumbnail.customMedia === 'object'
                            ? (item.videoThumbnail.customMedia as MediaType).thumbnailUrl ?? undefined
                            : media.thumbnailUrl ?? undefined
                        : undefined

                    return (
                        <div
                            key={item.instanceId || item.id || `media-${media.id}-${i}`}
                            className="group cursor-pointer"
                            style={{ breakInside: 'avoid', marginBottom: `${colGap}px`, display: 'block' }}
                            onClick={() => {
                                if (item.link || isVideo) return
                                if (onOpenLightbox) onOpenLightbox(i)
                                else setSelectedImage(media)
                            }}
                        >
                            {isVideo ? (
                                <video
                                    src={media.proxyUrl ?? media.originalUrl ?? undefined}
                                    poster={posterUrl}
                                    className="w-full h-auto block"
                                    style={{ objectPosition: `${fpX}% ${fpY}%` }}
                                    muted loop playsInline preload="none"
                                    onMouseEnter={(e) => { (e.target as HTMLVideoElement).play().catch(() => {}) }}
                                    onMouseLeave={(e) => { (e.target as HTMLVideoElement).pause() }}
                                />
                            ) : (
                                <div className="relative overflow-hidden">
                                    <img
                                        src={media.thumbnailUrl ?? media.proxyUrl ?? media.originalUrl ?? media.url ?? undefined}
                                        alt={item.alt || media.alt || ''}
                                        className="w-full h-auto block transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                                        loading="lazy"
                                    />
                                    {displayName && (
                                        <div className="absolute bottom-3 left-3 right-3 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-[10px] tracking-widest uppercase italic bg-black/40 backdrop-blur-sm p-2">
                                            {displayName}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                })}
                <Lightbox image={selectedImage} isOpen={!!selectedImage} onClose={() => setSelectedImage(null)} />
            </div>
        )
    }

    return (
        <div className="w-full">
            {strips.map((strip, stripIndex) => {
                const isFullWidthItem = strip.items.length === 1 && strip.items[0].size === 'full'
                const isLastRow = stripIndex === strips.length - 1
                const isSparseLastRow = isLastRow && strip.items.length <= 2 && strip.totalWeight < 2.0

                if (isMobile) {
                    // Mobile: single column, each item preserves its natural aspect ratio
                    return (
                        <div
                            key={strip.id}
                            style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: `${mobileGap}px`, marginBottom: `${mobileGap}px` }}
                        >
                            {strip.items.map((item) => {
                                const media = item.media as MediaType
                                if (!media) return null
                                const ar = media.width && media.height ? media.width / media.height : 1.5
                                const fpX = item.focalPoint?.x ?? 50
                                const fpY = item.focalPoint?.y ?? 50
                                const isVideo = media.mediaType === 'video'
                                const displayName = item.instanceTitle || item.caption || null
                                const posterUrl = isVideo
                                    ? item.videoThumbnail?.mode === 'custom' &&
                                      item.videoThumbnail.customMedia &&
                                      typeof item.videoThumbnail.customMedia === 'object'
                                        ? (item.videoThumbnail.customMedia as MediaType).thumbnailUrl ?? undefined
                                        : media.thumbnailUrl ?? undefined
                                    : undefined

                                return (
                                    <div
                                        key={item.instanceId || item.id || `media-${media.id}`}
                                        style={{ position: 'relative', width: '100%', paddingBottom: `${(1 / ar) * 100}%` }}
                                    >
                                        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
                                            {isVideo ? (
                                                <video
                                                    src={media.proxyUrl ?? media.originalUrl ?? undefined}
                                                    poster={posterUrl}
                                                    className="w-full h-full object-cover"
                                                    style={{ objectPosition: `${fpX}% ${fpY}%` }}
                                                    muted loop playsInline preload="none"
                                                    onMouseEnter={(e) => { (e.target as HTMLVideoElement).play().catch(() => {}) }}
                                                    onMouseLeave={(e) => { (e.target as HTMLVideoElement).pause() }}
                                                />
                                            ) : (
                                                <img
                                                    src={media.thumbnailUrl ?? media.proxyUrl ?? media.originalUrl ?? media.url ?? undefined}
                                                    alt={item.alt || media.alt || ''}
                                                    className="w-full h-full object-cover"
                                                    style={{ objectPosition: `${fpX}% ${fpY}%` }}
                                                    loading="lazy"
                                                />
                                            )}
                                            {displayName && (
                                                <div className="absolute bottom-3 left-3 right-3 text-white text-[10px] tracking-widest uppercase italic bg-black/40 backdrop-blur-sm p-2">
                                                    {displayName}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )
                }

                // Desktop: fixed-height justified rows — flex: ar*weight 1 0px ensures same height,
                // proportional widths, and no overlap/collision
                const stripRowHeight = isFullWidthItem ? rowHeight * 1.4 : rowHeight

                return (
                    <MotionContainer key={strip.id} type="reveal">
                        <div
                            style={{
                                display: 'flex',
                                width: '100%',
                                height: `${stripRowHeight}px`,
                                gap: `${itemGap}px`,
                                marginBottom: `${rowGap}px`,
                                overflow: 'hidden',
                            }}
                        >
                            {strip.items.map((item) => {
                                const media = item.media as MediaType
                                if (!media) return null

                                const ar = media.width && media.height ? media.width / media.height : 1.5
                                const weight = SIZE_WEIGHTS[(item.size as keyof typeof SIZE_WEIGHTS) ?? 'medium'] ?? 1.0
                                const flexGrow = isFullWidthItem ? 1 : ar * weight
                                const fpX = item.focalPoint?.x ?? 50
                                const fpY = item.focalPoint?.y ?? 50
                                const isVideo = media.mediaType === 'video'
                                const displayName = item.instanceTitle || item.caption || null
                                const posterUrl = isVideo
                                    ? item.videoThumbnail?.mode === 'custom' &&
                                      item.videoThumbnail.customMedia &&
                                      typeof item.videoThumbnail.customMedia === 'object'
                                        ? (item.videoThumbnail.customMedia as MediaType).thumbnailUrl ?? undefined
                                        : media.thumbnailUrl ?? undefined
                                    : undefined

                                return (
                                    <div
                                        key={item.instanceId || item.id || `media-${media.id}-${stripIndex}`}
                                        style={{
                                            flex: `${flexGrow} 1 0px`,
                                            minWidth: 0,
                                            overflow: 'hidden',
                                            position: 'relative',
                                            // Prevent sparse last-row items from blowing up to full width
                                            maxWidth: isSparseLastRow ? `${Math.min(45, flexGrow * 30)}%` : undefined,
                                        }}
                                        className="group cursor-pointer bg-zinc-900"
                                        onClick={() => {
                                            if (item.link || isVideo) return
                                            const idx = items.indexOf(item)
                                            if (onOpenLightbox) onOpenLightbox(idx >= 0 ? idx : stripIndex)
                                            else setSelectedImage(media)
                                        }}
                                    >
                                        {isVideo ? (
                                            <video
                                                src={media.proxyUrl ?? media.originalUrl ?? undefined}
                                                poster={posterUrl}
                                                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                                                style={{ objectPosition: `${fpX}% ${fpY}%` }}
                                                muted loop playsInline preload="none"
                                                aria-label={item.alt || media.alt || undefined}
                                                onMouseEnter={(e) => { (e.target as HTMLVideoElement).play().catch(() => {}) }}
                                                onMouseLeave={(e) => { (e.target as HTMLVideoElement).pause() }}
                                            />
                                        ) : (
                                            <img
                                                src={media.thumbnailUrl ?? media.proxyUrl ?? media.originalUrl ?? media.url ?? undefined}
                                                alt={item.alt || media.alt || ''}
                                                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                                                style={{ objectPosition: `${fpX}% ${fpY}%` }}
                                                loading="lazy"
                                            />
                                        )}
                                        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors duration-500 pointer-events-none" />
                                        {displayName && (
                                            <div className="absolute bottom-3 left-3 right-3 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-[10px] tracking-widest uppercase italic bg-black/40 backdrop-blur-sm p-2">
                                                {displayName}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </MotionContainer>
                )
            })}

            <Lightbox
                image={selectedImage}
                isOpen={!!selectedImage}
                onClose={() => setSelectedImage(null)}
            />
        </div>
    )
}
