'use client'

import { Media } from '@/components/Media'
import { Media as MediaType, Portfolio } from '@/payload-types'
import { cn } from '@/utilities/cn'
import React, { useMemo, useState } from 'react'
import { Lightbox } from './Lightbox'
import { MotionContainer } from './MotionContainer'

type GridItem = NonNullable<NonNullable<Extract<NonNullable<Portfolio['layoutBlocks']>[number], { blockType: 'grid' }>['items']>>[number] & {
    alt?: string
    caption?: string
    link?: string
}

interface MasonryGridProps {
    items: GridItem[]
    spacing?: 'small' | 'medium' | 'large' | 'none'
}

/**
 * RHYTHMIC MASONRY TYPES
 */
type Column = {
    items: GridItem[]
    units: number
}

type Strip = {
    columns: Column[]
    totalUnits: number
    id: string
}

const SIZE_UNITS = {
    small: 3,
    medium: 4,
    large: 8,
    full: 12
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
     * RHYTHMIC MOSAIC PACKER
     * Groups images into Strips and Columns. 
     * Implements "Double Stacking" for Small items to eliminate gaps.
     */
    const strips = useMemo(() => {
        const result: Strip[] = []
        let currentStrip: Strip = { columns: [], totalUnits: 0, id: Math.random().toString() }

        const flushStrip = () => {
            if (currentStrip.columns.length > 0) {
                result.push(currentStrip)
                currentStrip = { columns: [], totalUnits: 0, id: Math.random().toString() }
            }
        }

        for (let i = 0; i < items.length; i++) {
            const item = items[i]
            const size = item.size || 'medium'
            const units = SIZE_UNITS[size as keyof typeof SIZE_UNITS] || 4

            // Full width breaks the strip
            if (size === 'full') {
                flushStrip()
                result.push({ columns: [{ items: [item], units: 12 }], totalUnits: 12, id: `full-${i}` })
                continue
            }

            // OPTIMIZATION: Vertical Double-Stacking
            // If we have two adjacent Small items, stack them in one column to match height of neighbors
            if (size === 'small' && i + 1 < items.length && items[i + 1].size === 'small') {
                const nextItem = items[i + 1]
                const columnUnits = 3 // Still takes 3 units of width

                if (currentStrip.totalUnits + columnUnits <= 12) {
                    currentStrip.columns.push({ items: [item, nextItem], units: columnUnits })
                    currentStrip.totalUnits += columnUnits
                    i++ // Skip next item as it's paired
                    continue
                }
            }

            // Standard placement
            if (currentStrip.totalUnits + units > 12) {
                flushStrip()
                currentStrip.columns.push({ items: [item], units: units })
                currentStrip.totalUnits = units
            } else {
                currentStrip.columns.push({ items: [item], units: units })
                currentStrip.totalUnits += units
            }
        }

        flushStrip()
        return result
    }, [items])

    return (
        <div className="w-full flex flex-col overflow-hidden">
            {strips.map((strip) => (
                <div
                    key={strip.id}
                    className={cn(
                        "flex flex-col md:flex-row w-full items-stretch", // Stretch ensures columns match height
                        gapClass,
                        mbClass
                    )}
                >
                    {strip.columns.map((column, colIndex) => {
                        // 2. OPTICAL FLEX CALCULATION
                        // We calculate the effective aspect ratio of the column to weight the flex-grow.
                        // This makes the grid "Justified" (flush edges) while respecting size intent.
                        const colAspectRatio = (() => {
                            if (column.items.length === 0) return 1
                            if (column.items.length === 1) {
                                const m = column.items[0].media as MediaType
                                return (m?.width && m?.height) ? (m.width / m.height) : 1
                            }
                            // For stacked items, effective AR = 1 / sum(1/AR_i)
                            const invSum = column.items.reduce((sum, item) => {
                                const m = item.media as MediaType
                                const ar = (m?.width && m?.height) ? (m.width / m.height) : 1
                                return sum + (1 / ar)
                            }, 0)
                            return 1 / invSum
                        })()

                        const isLarge = column.units >= 8
                        const containerStyle = {
                            flexGrow: column.units * colAspectRatio,
                            flexBasis: `${(column.units / 12) * 100}%`,
                            maxHeight: isLarge ? '80vh' : '60vh', // Viewport-Bound Scaling
                        }

                        return (
                            <div
                                key={`${strip.id}-col-${colIndex}`}
                                className="w-full flex flex-col min-w-0"
                                style={containerStyle}
                            >
                                <div className={cn("flex flex-col h-full", gapClass)}>
                                    {column.items.map((item, itemIndex) => {
                                        const media = item.media as MediaType
                                        if (!media) return null

                                        // For stacked items (Double-Stacking), we use flex-1 to split height
                                        const isStacked = column.items.length > 1

                                        const Content = (
                                            <div
                                                className={cn(
                                                    "relative cursor-pointer bg-zinc-900 group overflow-hidden w-full",
                                                    isStacked ? "flex-1" : "h-full"
                                                )}
                                                onClick={() => !item.link && setSelectedImage(media)}
                                            >
                                                <Media
                                                    resource={media}
                                                    alt={item.alt || media.alt}
                                                    imgClassName="w-full h-full object-cover transition-all duration-700 ease-out group-hover:scale-[1.02] rounded-none shadow-sm"
                                                />
                                                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors duration-500 pointer-events-none" />

                                                {item.caption && (
                                                    <div className="absolute bottom-4 left-4 right-4 text-[white] opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-[10px] tracking-widest uppercase italic bg-black/40 backdrop-blur-sm p-2">
                                                        {item.caption}
                                                    </div>
                                                )}
                                            </div>
                                        )

                                        return (
                                            <div
                                                key={item.id || media.id}
                                                className={cn("w-full", isStacked ? "flex-1 min-h-0" : "h-full")}
                                            >
                                                <MotionContainer type="reveal" delay={itemIndex * 0.1}>
                                                    {item.link ? (
                                                        <a href={item.link} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                                                            {Content}
                                                        </a>
                                                    ) : Content}
                                                </MotionContainer>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </div>
            ))}

            <Lightbox
                image={selectedImage}
                isOpen={!!selectedImage}
                onClose={() => setSelectedImage(null)}
            />
        </div>
    )
}
