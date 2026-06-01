'use client'

import React from 'react'
import Image from 'next/image'
import { cn } from '@/utilities/cn'
import type { Media } from '@/payload-types'
import tempAsset from '@/assets/hub/temp_asset.png'

interface CompactGridProps {
  items: Media[]
  selectedIds: Set<string | number>
  isSelectionMode: boolean
  onSelect: (id: string | number) => void
  onView: (media: Media) => void
}

const GRID_COLS = 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7'

export const CompactGrid: React.FC<CompactGridProps> = ({
  items,
  selectedIds,
  isSelectionMode,
  onSelect,
  onView,
}) => {
  return (
    <div className={cn('grid gap-1.5', GRID_COLS)}>
      {items.map((item) => (
        <CompactTile
          key={item.id}
          media={item}
          isSelected={selectedIds.has(item.id)}
          isSelectionMode={isSelectionMode || selectedIds.size > 0}
          onSelect={onSelect}
          onView={onView}
        />
      ))}
    </div>
  )
}

interface CompactTileProps {
  media: Media
  isSelected: boolean
  isSelectionMode: boolean
  onSelect: (id: string | number) => void
  onView: (media: Media) => void
}

function CompactTile({ media, isSelected, isSelectionMode, onSelect, onView }: CompactTileProps) {
  const isFailed = media.ingestionStatus === 'failed'
  const isReady = media.ingestionStatus === 'ready'
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'

  const safeUrl = isFailed
    ? null
    : media.thumbnailUrl ||
      media.proxyUrl ||
      (isReady ? media.originalUrl || media.url : null)

  const src = safeUrl ? (safeUrl.startsWith('http') ? safeUrl : `${serverUrl}${safeUrl}`) : null

  const mimeType = media.mimeType || ''
  const isVideo = mimeType.startsWith('video/')
  const isRaw =
    mimeType.startsWith('image/x-raw') || mimeType.includes('x-raw') || mimeType.includes('x-adobe')
  const typeLabel = isVideo ? 'VID' : isRaw ? 'RAW' : null

  const title = media.alt || media.filename || 'Untitled'

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isSelectionMode) onSelect(media.id)
    else onView(media)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (isSelectionMode) onSelect(media.id)
      else onView(media)
    }
    if (e.key === ' ') { e.preventDefault(); onSelect(media.id) }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={title}
      aria-pressed={isSelected}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'relative aspect-square rounded-[12px] overflow-hidden cursor-pointer',
        'bg-gallery-surface dark:bg-white/[0.04]',
        'transition-all duration-200 group',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gallery-gold',
        isSelected
          ? 'ring-2 ring-gallery-gold/60 ring-offset-1'
          : 'hover:opacity-90',
      )}
    >
      {/* Image */}
      {src || isFailed ? (
        <Image
          src={isFailed ? tempAsset : src!}
          alt={title}
          fill
          loading="lazy"
          unoptimized={!isFailed}
          className={cn(
            'object-cover transition-transform duration-300 group-hover:scale-[1.03]',
            isFailed && 'opacity-30 grayscale',
          )}
          sizes="(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 14vw"
        />
      ) : (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gallery-surface dark:bg-white/[0.04] animate-pulse"
        />
      )}

      {/* Type badge — top-left */}
      {typeLabel && (
        <span className="absolute top-1 left-1 font-rubik text-[8px] font-bold tracking-wider bg-black/60 text-white/90 px-1.5 py-0.5 rounded-[6px] leading-none">
          {typeLabel}
        </span>
      )}

      {/* Selection checkbox */}
      {(isSelectionMode || isSelected) && (
        <button
          tabIndex={-1}
          aria-hidden="true"
          onClick={(e) => { e.stopPropagation(); onSelect(media.id) }}
          className={cn(
            'absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center transition-all z-10',
            isSelected
              ? 'bg-gallery-gold shadow-[0_1px_4px_rgba(215,153,34,0.6)]'
              : 'bg-white/80 dark:bg-black/60 backdrop-blur-sm',
          )}
        >
          {isSelected && (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
              <path d="M2 5l2.5 2.5 4-4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      )}

      {/* Hover: bottom gradient + title */}
      <div className={cn(
        'absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/60 to-transparent',
        'transition-opacity duration-150 flex items-end px-1.5 pb-1',
        'opacity-0 group-hover:opacity-100',
      )}>
        <span className="font-rubik text-[8px] text-white/80 truncate leading-none">
          {typeLabel ?? (media.filename?.split('.').pop()?.toUpperCase() ?? '')}
        </span>
      </div>
    </div>
  )
}
