'use client'

import { Media } from '@/components/Media'
import { Media as MediaType } from '@/payload-types'
import React from 'react'
import { MotionContainer } from './MotionContainer'

interface MasonryGridProps {
    items: (number | MediaType)[]
    columns?: 'small' | 'medium' | 'large'
    spacing?: 'small' | 'medium' | 'large' | 'none'
}

export const MasonryGrid: React.FC<MasonryGridProps> = ({
    items,
    columns = 'medium',
    spacing = 'medium'
}) => {
    const columnCount = {
        small: 'columns-2 md:columns-3 lg:columns-4',
        medium: 'columns-1 md:columns-2 lg:columns-3',
        large: 'columns-1 lg:columns-2',
    }[columns]

    const gapSize = {
        small: 'gap-2',
        medium: 'gap-4',
        large: 'gap-8',
        none: 'gap-0',
    }[spacing]

    const itemSpacing = {
        small: 'mb-2',
        medium: 'mb-4',
        large: 'mb-8',
        none: 'mb-0',
    }[spacing]

    return (
        <div className={`w-full ${columnCount} ${gapSize}`}>
            {items.map((item, index) => (
                <div key={typeof item === 'number' ? item : item.id} className={`break-inside-avoid ${itemSpacing}`}>
                    <MotionContainer type="hoverInvert" delay={index * 0.05}>
                        <div className="relative group overflow-hidden rounded-lg bg-white/5 backdrop-blur-sm border border-white/10 transition-all duration-500 hover:border-white/30">
                            <Media
                                resource={item}
                                imgClassName="w-full h-auto object-cover grayscale group-hover:grayscale-0 transition-all duration-700 ease-out transform group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center">
                                <span className="text-white text-sm font-medium tracking-widest uppercase">View Case Study</span>
                            </div>
                        </div>
                    </MotionContainer>
                </div>
            ))}
        </div>
    )
}
