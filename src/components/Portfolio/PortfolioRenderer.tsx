'use client'

import { Media } from '@/components/Media'
import { RichText } from '@/components/RichText'
import { Portfolio } from '@/payload-types'
import React from 'react'
import { FilmstripRow } from './FilmstripRow'
import { MasonryGrid } from './MasonryGrid'
import { MotionContainer } from './MotionContainer'
import { UniformGrid } from './UniformGrid'

type LayoutBlock = NonNullable<Portfolio['layoutBlocks']>[number]
type GridBlock = Extract<LayoutBlock, { blockType: 'grid' }>

interface PortfolioRendererProps {
  layoutBlocks: LayoutBlock[]
}

function renderSectionHeader(block: GridBlock) {
  // Cast to access new fields not yet in generated payload-types.ts
  const b = block as unknown as Record<string, unknown>
  if (!b.showSectionHeader || !b.sectionName) return null
  const name = b.sectionName as string
  return (
    <h2
      className="font-['Rubik_Mono_One',monospace] uppercase tracking-[0.25em] text-[color:var(--portfolio-accent)] text-xs mb-8 opacity-60"
      aria-label={name}
    >
      {name}
    </h2>
  )
}

function renderGridBlock(block: GridBlock, index: number) {
  // Defensive guard — block.items may be null/undefined due to data corruption
  const items = Array.isArray(block.items) ? block.items : []
  // Empty sections are suppressed (EC-03)
  if (items.length === 0) return null

  const b = block as Record<string, unknown>
  const layoutStyle = b.layoutStyle as string | undefined
  const anchorId = b.sectionAnchor as string | undefined
  const preserveAspectRatio = Boolean(b.preserveAspectRatio)
  const sectionWidth = (b.sectionWidth as string | undefined) ?? 'full'

  const widthClass: Record<string, string> = {
    full: '',
    wide: 'max-w-[1400px] mx-auto',
    contained: 'max-w-[1100px] mx-auto',
    narrow: 'max-w-[800px] mx-auto',
  }

  return (
    <section
      key={block.id ?? index}
      id={anchorId ?? undefined}
      className="py-12 px-6 md:px-12 lg:px-24"
      style={{ scrollMarginTop: '80px' }}
    >
      <div className={widthClass[sectionWidth] ?? ''}>
        {renderSectionHeader(block)}

        {layoutStyle === 'filmstrip' ? (
          <FilmstripRow
            items={items}
            trackHeight={b.filmstripTrackHeight as string | undefined}
            sectionName={b.sectionName as string | undefined}
          />
        ) : layoutStyle === 'uniform_grid' ? (
          <UniformGrid
            items={items}
            columns={b.uniformGridColumns as string | undefined}
            spacing={block.spacing ?? 'medium'}
          />
        ) : (
          <MasonryGrid items={items} spacing={block.spacing ?? 'medium'} preserveAspectRatio={preserveAspectRatio} />
        )}
      </div>
    </section>
  )
}

export const PortfolioRenderer: React.FC<PortfolioRendererProps> = ({ layoutBlocks }) => {
  return (
    <div className="flex flex-col w-full">
      {layoutBlocks.map((block, index) => {
        switch (block.blockType) {
          case 'grid':
            return renderGridBlock(block, index)

          case 'text': {
            const alignment = {
              left: 'text-left',
              center: 'text-center',
              right: 'text-right',
            }[block.alignment || 'left']

            return (
              <section
                key={block.id || index}
                className="py-12 px-6 md:px-12 lg:px-24 max-w-5xl mx-auto w-full"
              >
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
          }

          case 'featured':
            if (!block.media) return null
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

          case 'spacer': {
            const height = {
              small: 'h-12 md:h-24',
              medium: 'h-24 md:h-48',
              large: 'h-48 md:h-96',
            }[block.size || 'medium']

            return (
              <div
                key={block.id || index}
                className={`${height} flex items-center justify-center px-12 md:px-24`}
              >
                {block.showDivider && (
                  <div className="w-full h-px bg-[var(--portfolio-accent)] opacity-10" />
                )}
              </div>
            )
          }

          default:
            return null
        }
      })}
    </div>
  )
}
