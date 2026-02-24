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

type Strip = {
    items: GridItem[]
    totalUnits: number
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

    // 1. RHYTHMIC STRIP ALGORITHM
    // Groups items into sequential horizontal bands (strips) based on a 12-unit grid
    const strips = useMemo(() => {
        const result: Strip[] = []
        let currentStrip: Strip = { items: [], totalUnits: 0 }

        items.forEach((item) => {
            const size = item.size || 'medium'
            const units = SIZE_UNITS[size as keyof typeof SIZE_UNITS] || 4

            // Full width items always start a new strip and take it all
            if (size === 'full') {
                if (currentStrip.items.length > 0) result.push(currentStrip)
                result.push({ items: [item], totalUnits: 12 })
                currentStrip = { items: [], totalUnits: 0 }
                return
            }

            // Check if item fits in current strip
            if (currentStrip.totalUnits + units > 12) {
                result.push(currentStrip)
                currentStrip = { items: [item], totalUnits: units }
            } else {
                currentStrip.items.push(item)
                currentStrip.totalUnits += units
            }
        })

        if (currentStrip.items.length > 0) result.push(currentStrip)
        return result
    }, [items])

    return (
        <div className="w-full flex flex-col overflow-hidden">
            {strips.map((strip, stripIndex) => (
                <div
                    key={`strip-${stripIndex}`}
                    className={cn(
                        "flex flex-col md:flex-row w-full items-start",
                        gapClass,
                        mbClass
                    )}
                >
                    {strip.items.map((item, itemIndex) => {
                        const media = item.media as MediaType
                        if (!media) return null

                        const size = item.size || 'medium'
                        const units = SIZE_UNITS[size as keyof typeof SIZE_UNITS] || 4

                        // Calculate flex basis for desktop (12-column logic)
                        // On mobile, we default to full width unless it's a small item which can stay small?
                        // Per spec: Mobile collapses to 100% or optional diptych.
                        // Let's implement 100% for now but keep small items distinct if possible.
                        const flexBasis = {
                            3: 'md:basis-1/4', // Small
                            4: 'md:basis-1/3', // Medium
                            8: 'md:basis-2/3', // Large
                            12: 'md:basis-full' // Full
                        }[units as 3 | 4 | 8 | 12]

                        const Content = (
                            <div
                                className="relative cursor-pointer bg-zinc-900 group overflow-hidden w-full h-full"
                                onClick={() => !item.link && setSelectedImage(media)}
                            >
                                <Media
                                    resource={media}
                                    alt={item.alt || media.alt}
                                    imgClassName="w-full h-auto object-cover transition-all duration-700 ease-out group-hover:scale-[1.02] rounded-none shadow-sm"
                                />
                                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors duration-500 pointer-events-none" />

                                {item.caption && (
                                    <div className="mt-3 text-[var(--portfolio-text)] opacity-60 text-[10px] tracking-widest uppercase italic">
                                        {item.caption}
                                    </div>
                                )}
                            </div>
                        )

                        return (
                            <div
                                key={item.id || media.id}
                                className={cn(
                                    "w-full flex-grow flex-shrink-0 min-w-0",
                                    flexBasis
                                )}
                                style={{
                                    // We use flex-grow based on units to fill the remaining space of a strip symmetrically
                                    flexGrow: units,
                                    // Flex basis ensures the general proportion
                                }}
                            >
                                <MotionContainer type="reveal" delay={0}>
                                    {item.link ? (
                                        <a href={item.link} target="_blank" rel="noopener noreferrer" className="block w-full">
                                            {Content}
                                        </a>
                                    ) : Content}
                                </MotionContainer>
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
