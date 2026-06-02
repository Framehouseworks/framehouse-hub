'use client'

import { RichText } from '@/components/RichText'
import { Media } from '@/components/Media'
import { Portfolio } from '@/payload-types'
import type { Media as MediaType } from '@/payload-types'
import React, { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { FilmstripRow } from './FilmstripRow'
import { MasonryGrid } from './MasonryGrid'
import { MotionContainer } from './MotionContainer'
import { PortfolioLightbox, type LightboxItem } from './PortfolioLightbox'
import { SectionNavigator, type SectionNavItem } from './SectionNavigator'
import { UniformGrid } from './UniformGrid'
import { ReviewModeProvider, type ReviewConfig } from './review/ReviewModeProvider'
import { SelectionModePill } from './review/SelectionModePill'

type LayoutBlock = NonNullable<Portfolio['layoutBlocks']>[number]
type GridBlock = Extract<LayoutBlock, { blockType: 'grid' }>

interface PortfolioRendererProps {
  layoutBlocks: LayoutBlock[]
  reviewConfig?: ReviewConfig | null
}

type LightboxState = {
  items: LightboxItem[]
  currentIndex: number
  sectionName: string | undefined
} | null

const WIDTH_CLASS: Record<string, string> = {
  full: '',
  wide: 'max-w-[1400px] mx-auto',
  contained: 'max-w-[1100px] mx-auto',
  narrow: 'max-w-[800px] mx-auto',
}

// Throttle duplicate toast notifications for right-click spam
let lastToastAt = 0

function renderSectionHeader(block: GridBlock) {
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

function blockToLightboxItems(block: GridBlock): LightboxItem[] {
  const items = Array.isArray(block.items) ? block.items : []
  return items
    .filter((item) => item.media && typeof item.media === 'object')
    .map((item) => ({
      media: item.media as MediaType,
      alt: item.alt,
      caption: item.caption,
      instanceTitle: (item as Record<string, unknown>).instanceTitle as string | null | undefined,
    }))
}

export const PortfolioRenderer: React.FC<PortfolioRendererProps> = ({ layoutBlocks, reviewConfig }) => {
  const [lightbox, setLightbox] = useState<LightboxState>(null)

  // Section nav items — only named grid sections
  const navSections = useMemo<SectionNavItem[]>(() => {
    return layoutBlocks.flatMap((block) => {
      if (block.blockType !== 'grid') return []
      const b = block as unknown as Record<string, unknown>
      const anchor = b.sectionAnchor as string | undefined
      const name = b.sectionName as string | undefined
      const show = b.showSectionHeader as boolean | undefined
      if (!anchor || !name || !show) return []
      return [{ anchor, name }]
    })
  }, [layoutBlocks])

  // Pre-build LightboxItem arrays per grid block (keyed by block id or index)
  const sectionLightboxItems = useMemo(() => {
    return layoutBlocks.map((block) => {
      if (block.blockType !== 'grid') return []
      return blockToLightboxItems(block as GridBlock)
    })
  }, [layoutBlocks])

  const openLightbox = useCallback(
    (blockIndex: number, sectionName: string | undefined) =>
      (itemIndex: number) => {
        const items = sectionLightboxItems[blockIndex] ?? []
        if (items.length === 0) return
        setLightbox({
          items,
          currentIndex: Math.min(itemIndex, items.length - 1),
          sectionName,
        })
      },
    [sectionLightboxItems],
  )

  const closeLightbox = useCallback(() => setLightbox(null), [])

  const navigateLightbox = useCallback((index: number) => {
    setLightbox((prev) => (prev ? { ...prev, currentIndex: index } : prev))
  }, [])

  // Event delegation: intercept right-click on img/video for download protection
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.tagName === 'IMG' || target.tagName === 'VIDEO') {
      e.preventDefault()
      const now = Date.now()
      if (now - lastToastAt > 4000) {
        lastToastAt = now
        toast.info('Downloads are disabled for this preview gallery', {
          duration: 3000,
          position: 'bottom-right',
        })
      }
    }
  }, [])

  const content = (
    <>
      {/* Section navigation (desktop pill + tablet indicator) */}
      <SectionNavigator sections={navSections} />

      {/* Mobile selection mode toggle */}
      {reviewConfig?.allowSelection && <SelectionModePill />}

      {/* Review message banner */}
      {reviewConfig?.reviewMessage && (
        <div className="px-6 md:px-12 lg:px-24 mb-6">
          <p className="text-sm text-[color:var(--portfolio-text)] opacity-50 max-w-2xl leading-relaxed">
            {reviewConfig.reviewMessage}
          </p>
        </div>
      )}

      {/* Portfolio content — right-click protection via event delegation */}
      <div
        className="flex flex-col w-full"
        onContextMenu={handleContextMenu}
        style={{ paddingBottom: 'var(--review-bar-height, 0px)' }}
      >
        {layoutBlocks.map((block, blockIndex) => {
          switch (block.blockType) {
            case 'grid':
              return renderGridBlock(block, blockIndex, openLightbox, sectionLightboxItems)

            case 'text': {
              const alignment = {
                left: 'text-left',
                center: 'text-center',
                right: 'text-right',
              }[block.alignment || 'left']

              return (
                <section
                  key={block.id || blockIndex}
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
                <section key={block.id || blockIndex} className="py-24 px-6 md:px-12 lg:px-24">
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
                  key={block.id || blockIndex}
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

      {/* Single shared lightbox (section-scoped). Always mounted so
          AnimatePresence can play the exit animation on close. */}
      <PortfolioLightbox
        items={lightbox?.items ?? []}
        currentIndex={lightbox?.currentIndex ?? 0}
        sectionName={lightbox?.sectionName}
        isOpen={lightbox !== null}
        onClose={closeLightbox}
        onNavigate={navigateLightbox}
        allowComments={reviewConfig?.allowComments ?? false}
      />
    </>
  )

  if (reviewConfig) {
    return <ReviewModeProvider config={reviewConfig}>{content}</ReviewModeProvider>
  }

  return content
}

function renderGridBlock(
  block: GridBlock,
  blockIndex: number,
  openLightbox: (blockIndex: number, sectionName: string | undefined) => (itemIndex: number) => void,
  sectionLightboxItems: LightboxItem[][],
) {
  const items = Array.isArray(block.items) ? block.items : []
  // Suppress empty sections
  if (items.length === 0) return null

  const b = block as Record<string, unknown>
  const layoutStyle = b.layoutStyle as string | undefined
  const anchorId = b.sectionAnchor as string | undefined
  const preserveAspectRatio = Boolean(b.preserveAspectRatio)
  const sectionWidth = (b.sectionWidth as string | undefined) ?? 'full'
  const sectionName = b.sectionName as string | undefined

  // Map each grid item to its index within the section's lightbox items
  // (only non-video image items are in lightboxItems — skip videos for lightbox)
  const lightboxItems = sectionLightboxItems[blockIndex] ?? []
  const onOpenLightbox =
    lightboxItems.length > 0 ? openLightbox(blockIndex, sectionName) : undefined

  return (
    <section
      key={block.id ?? blockIndex}
      id={anchorId ?? undefined}
      className="py-12 px-6 md:px-12 lg:px-24"
      style={{ scrollMarginTop: '80px' }}
    >
      <div className={WIDTH_CLASS[sectionWidth] ?? ''}>
        {renderSectionHeader(block)}

        {layoutStyle === 'filmstrip' ? (
          <FilmstripRow
            items={items}
            trackHeight={b.filmstripTrackHeight as string | undefined}
            sectionName={sectionName}
            onOpenLightbox={onOpenLightbox}
          />
        ) : layoutStyle === 'uniform_grid' ? (
          <UniformGrid
            items={items}
            columns={b.uniformGridColumns as string | undefined}
            spacing={block.spacing ?? 'medium'}
            onOpenLightbox={onOpenLightbox}
          />
        ) : (
          <MasonryGrid
            items={items}
            spacing={block.spacing ?? 'medium'}
            preserveAspectRatio={preserveAspectRatio}
            onOpenLightbox={onOpenLightbox}
          />
        )}
      </div>
    </section>
  )
}
