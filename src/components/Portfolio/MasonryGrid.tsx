'use client'

import { Media } from '@/components/Media'
import { Media as MediaType, Portfolio } from '@/payload-types'
import React, { useState } from 'react'
import { Lightbox } from './Lightbox'
import { MotionContainer } from './MotionContainer'

type GridItem = NonNullable<NonNullable<Extract<NonNullable<Portfolio['layoutBlocks']>[number], { blockType: 'grid' }>['items']>>[number]

interface MasonryGridProps {
    items: GridItem[]
    spacing?: 'small' | 'medium' | 'large' | 'none'
}

export const MasonryGrid: React.FC<MasonryGridProps> = ({
    items,
    spacing = 'medium'
}) => {
    const [selectedImage, setSelectedImage] = useState<MediaType | null>(null)

    const gapSize = {
        small: 'gap-4 md:gap-6',
        medium: 'gap-8 md:gap-12',
        large: 'gap-16 md:gap-24',
        none: 'gap-0',
    }[spacing]

    const itemSpacing = {
        small: 'mb-4 md:mb-6',
        medium: 'mb-8 md:mb-12',
        large: 'mb-16 md:mb-24',
        none: 'mb-0',
    }[spacing]

    // Group items into segments separated by full-width items
    const groups: (GridItem[] | GridItem)[] = []
    let currentGroup: GridItem[] = []

    items.forEach((item) => {
        if (item.size === 'full') {
            if (currentGroup.length > 0) {
                groups.push(currentGroup)
                currentGroup = []
            }
            groups.push(item)
        } else {
            currentGroup.push(item)
        }
    })
    if (currentGroup.length > 0) {
        groups.push(currentGroup)
    }

    return (
        <div className="w-full flex flex-col">
            {groups.map((group, groupIndex) => {
                if (Array.isArray(group)) {
                    // Render a masonry columns section
                    return (
                        <div
                            key={`group-${groupIndex}`}
                            className={`columns-1 md:columns-2 lg:columns-3 ${gapSize} w-full ${itemSpacing}`}
                        >
                            {group.map((item) => {
                                const media = item.media as MediaType
                                if (!media) return null

                                // Determine column span based on size
                                const sizeClass = item.size === 'large'
                                    ? 'md:col-span-2'
                                    : item.size === 'small'
                                        ? 'w-full'
                                        : 'w-full' // medium is default

                                return (
                                    <div
                                        key={item.id || media.id}
                                        className={`break-inside-avoid-column ${itemSpacing} ${sizeClass}`}
                                    >
                                        <MotionContainer type="reveal" delay={0}>
                                            <div
                                                className="relative cursor-pointer bg-zinc-900 group overflow-hidden"
                                                onClick={() => setSelectedImage(media)}
                                            >
                                                <Media
                                                    resource={media}
                                                    imgClassName="w-full h-auto object-cover transition-all duration-700 ease-out group-hover:scale-[1.02] rounded-none shadow-sm"
                                                />
                                                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors duration-500 pointer-events-none" />
                                            </div>
                                        </MotionContainer>
                                    </div>
                                )
                            })}
                        </div>
                    )
                } else {
                    // Render a single full-width item
                    const item = group
                    const media = item.media as MediaType
                    if (!media) return null
                    return (
                        <div key={item.id || `full-${groupIndex}`} className={`w-full ${itemSpacing}`}>
                            <MotionContainer type="reveal">
                                <div
                                    className="relative cursor-pointer bg-zinc-900 group overflow-hidden"
                                    onClick={() => setSelectedImage(media)}
                                >
                                    <Media
                                        resource={media}
                                        imgClassName="w-full h-auto object-cover transition-all duration-700 ease-out group-hover:scale-[1.01] rounded-none shadow-sm"
                                    />
                                    <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors duration-500 pointer-events-none" />
                                </div>
                            </MotionContainer>
                        </div>
                    )
                }
            })}

            <Lightbox
                image={selectedImage}
                isOpen={!!selectedImage}
                onClose={() => setSelectedImage(null)}
            />
        </div>
    )
}
