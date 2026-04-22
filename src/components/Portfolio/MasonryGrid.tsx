'use client'

import { Media } from '@/components/Media'
import { Media as MediaType, Portfolio } from '@/payload-types'
import { cn } from '@/utilities/cn'
import React, { useMemo, useState } from 'react'
import { Lightbox } from './Lightbox'
import { MotionContainer } from './MotionContainer'

type GridItem = NonNullable<NonNullable<Extract<NonNullable<Portfolio['layoutBlocks']>[number], { blockType: 'grid' }>['items']>>[number] & {
    alt?: string | null
    caption?: string | null
    link?: string | null
}

interface MasonryGridProps {
    items: GridItem[]
    spacing?: 'small' | 'medium' | 'large' | 'none'
}

type Strip = {
    items: GridItem[]
    totalWeight: number
    id: string
}

const SIZE_WEIGHTS = {
    small: 0.7,
    medium: 1.0,
    large: 2.0,
    full: 4.0
}

export const MasonryGrid: React.FC<MasonryGridProps> = ({
    items,
    spacing = 'medium'
}) => {
    const [selectedImage, setSelectedImage] = useState<MediaType | null>(null)

    const gapClass = {
        small: 'gap-4 md:gap-6',
        medium: 'gap-8 md:gap-12',
        large: 'gap-16 md:gap-24',
        none: 'gap-0',
    }[spacing]

    const mbClass = {
        small: 'mb-4 md:mb-6',
        medium: 'mb-8 md:mb-12',
        large: 'mb-16 md:mb-24',
        none: 'mb-0',
    }[spacing]

    /**
     * TITAN V3 REFINED: JUSTIFIED ROW ENGINE
     * mathematically perfect row-based packing with last-row "bloat" protection.
     */
    const strips = useMemo(() => {
        const result: Strip[] = []
        let currentStrip: GridItem[] = []
        let currentWeight = 0
        const WEIGHT_THRESHOLD = 3.0 // Optimal number of "Medium" equivalents per row

        const flushStrip = () => {
            if (currentStrip.length > 0) {
                result.push({ 
                    items: [...currentStrip], 
                    totalWeight: currentWeight,
                    id: `strip-${result.length}`
                })
                currentStrip = []
                currentWeight = 0
            }
        }

        items.forEach((item) => {
            const size = item.size || 'medium'
            const weightMultiplier = SIZE_WEIGHTS[size as keyof typeof SIZE_WEIGHTS] || 1.0
            const media = item.media as MediaType
            // Defensive AR: Fallback to 1.5 (Standard landscape) if dimensions missing
            const ar = (media?.width && media?.height) ? (media.width / media.height) : 1.5
            const weight = weightMultiplier * ar

            if (size === 'full') {
                flushStrip()
                result.push({ items: [item], totalWeight: 4.0, id: `full-${result.length}` })
                return
            }

            // If adding this item pushes us too far over the threshold, flush first
            // We use a 0.7x buffer to allow slightly overflowed rows rather than sparse ones
            if (currentWeight > 0 && currentWeight + (weight * 0.7) > WEIGHT_THRESHOLD) {
                flushStrip()
            }

            currentStrip.push(item)
            currentWeight += weight
        })

        flushStrip()
        return result
    }, [items])

    return (
        <div className="w-full flex flex-col overflow-hidden">
            {strips.map((strip, stripIndex) => {
                const isFullWidthItem = strip.items.length === 1 && strip.items[0].size === 'full'
                const isLastRow = stripIndex === strips.length - 1
                const isSparseLastRow = isLastRow && strip.totalWeight < 2.0

                return (
                    <div
                        key={strip.id}
                        className={cn(
                            "flex flex-col md:flex-row w-full items-start", 
                            gapClass,
                            mbClass
                        )}
                    >
                        {strip.items.map((item) => {
                            const media = item.media as MediaType
                            if (!media) return null

                            const ar = (media?.width && media?.height) ? (media.width / media.height) : 1.5
                            const weightMultiplier = SIZE_WEIGHTS[item.size as keyof typeof SIZE_WEIGHTS] || 1.0
                            const growFactor = ar * weightMultiplier
                            
                            // TITAN V3: INTRINSIC FLEX CALCULATION
                            const itemStyle: React.CSSProperties = isFullWidthItem ? { width: '100%' } : {
                                flex: `${growFactor} 1 0%`,
                                minWidth: '0',
                                aspectRatio: `${ar}`,
                                // TITAN V3: LAST ROW BLOAT GUARD
                                // If the last row is sparse, we cap the flex-basis to prevent 
                                // images from taking up 100% width and being massive.
                                maxWidth: isSparseLastRow ? `${Math.min(growFactor * 25, 50)}%` : 'none'
                            }

                            return (
                                <div
                                    key={item.id || media.id}
                                    className="w-full relative min-h-0"
                                    style={itemStyle}
                                >
                                    <MotionContainer type="reveal" delay={0.1}>
                                        <div
                                            className="relative cursor-pointer bg-zinc-900 group overflow-hidden w-full h-full"
                                            onClick={() => !item.link && setSelectedImage(media)}
                                        >
                                            <Media
                                                resource={media}
                                                alt={item.alt || media.alt}
                                                imgClassName="w-full h-full object-cover object-center transition-all duration-700 ease-out group-hover:scale-[1.02] rounded-none shadow-sm"
                                            />
                                            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors duration-500 pointer-events-none" />

                                            {item.caption && (
                                                <div className="absolute bottom-4 left-4 right-4 text-[white] opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-[10px] tracking-widest uppercase italic bg-black/40 backdrop-blur-sm p-2">
                                                    {item.caption}
                                                </div>
                                            )}
                                        </div>
                                    </MotionContainer>
                                </div>
                            )
                        })}
                    </div>
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
