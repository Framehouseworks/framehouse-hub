'use client'

import { Media } from '@/components/Media'
import { RichText } from '@/components/RichText'
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
                                    spacing={block.spacing || 'medium'}
                                />
                            </section>
                        )
                    case 'text':
                        const alignment = {
                            left: 'text-left',
                            center: 'text-center',
                            right: 'text-right',
                        }[block.alignment || 'left']

                        return (
                            <section key={block.id || index} className="py-12 px-6 md:px-12 lg:px-24 max-w-5xl mx-auto w-full">
                                <MotionContainer type="fadeEntrance">
                                    <RichText
                                        data={block.content}
                                        className={`${alignment} !max-w-none prose-lg md:prose-xl not-italic`}
                                        enableProse={true}
                                        enableGutter={false}
                                    />
                                </MotionContainer>
                            </section>
                        )
                    case 'featured':
                        return (
                            <section key={block.id || index} className="py-24 px-6 md:px-12 lg:px-24">
                                <MotionContainer type="parallax">
                                    <div className="relative aspect-[16/9] w-full overflow-hidden rounded-none">
                                        <Media
                                            resource={block.media}
                                            imgClassName="w-full h-full object-cover rounded-none"
                                        />
                                        {block.caption && (
                                            <div className="mt-6">
                                                <RichText
                                                    data={block.caption}
                                                    className="text-[var(--portfolio-text)] opacity-60 text-sm tracking-widest uppercase not-italic"
                                                    enableGutter={false}
                                                    enableProse={false}
                                                />
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
                                    <div className="w-full h-px bg-[var(--portfolio-accent)] opacity-10" />
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
