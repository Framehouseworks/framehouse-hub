'use client'

import { Media } from '@/components/Media'
import { Portfolio } from '@/payload-types'
import React from 'react'
import { MasonryGrid } from './MasonryGrid'
import { MotionContainer } from './MotionContainer'

type LayoutBlock = NonNullable<Portfolio['layoutBlocks']>[number]

interface PortfolioRendererProps {
    layoutBlocks: LayoutBlock[]
}

export const PortfolioRenderer: React.FC<PortfolioRendererProps> = ({ layoutBlocks }) => {
    return (
        <div className="flex flex-col w-full">
            {layoutBlocks.map((block, index) => {
                switch (block.blockType) {
                    case 'grid':
                        return (
                            <section key={block.id || index} className="py-12 px-6 md:px-12 lg:px-24">
                                <MasonryGrid
                                    items={block.items || []}
                                    columns={block.sizeMode || 'medium'}
                                    spacing={block.spacing || 'medium'}
                                />
                            </section>
                        )
                    case 'featured':
                        return (
                            <section key={block.id || index} className="py-24 px-6 md:px-12 lg:px-24">
                                <MotionContainer type="staggerContainer">
                                    <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl">
                                        <Media
                                            resource={block.media}
                                            imgClassName="w-full h-full object-cover transform hover:scale-105 transition-transform duration-1000"
                                        />
                                        {block.caption && (
                                            <div className="absolute bottom-8 left-8">
                                                <p className="text-white text-xl font-light tracking-tight opacity-80 backdrop-blur-sm bg-black/20 p-4 rounded-lg border border-white/10">
                                                    {block.caption}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </MotionContainer>
                            </section>
                        )
                    case 'spacer':
                        const height = {
                            small: 'h-12 md:h-24',
                            medium: 'h-24 md:h-48',
                            large: 'h-48 md:h-96',
                        }[block.size || 'medium']

                        return (
                            <div key={block.id || index} className={`${height} flex items-center justify-center px-12 md:px-24`}>
                                {block.showDivider && (
                                    <div className="w-full h-px bg-[var(--portfolio-accent)] opacity-20" />
                                )}
                            </div>
                        )
                    default:
                        return null
                }
            })}
        </div>
    )
}
