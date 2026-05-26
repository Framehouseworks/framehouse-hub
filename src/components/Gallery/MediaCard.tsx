'use client'

import type { Media } from '@/payload-types'
import { cn } from '@/utilities/cn'
import { motion } from 'framer-motion'
import Image from 'next/image'
import React from 'react'
import tempAsset from '@/assets/hub/temp_asset.png'
import { updateMediaAction } from '@/app/(dashboard)/actions/media'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { CardTopBadges } from './cards/CardTopBadges'
import { CardIdentityBar } from './cards/CardIdentityBar'
import { CardMetadataPanel } from './cards/CardMetadataPanel'

interface Props {
  media: Media
  onView?: () => void
  onSelect?: (id: string | number) => void
  isSelected?: boolean
  isSelectionMode?: boolean
}

export const MediaCard: React.FC<Props> = ({
  media,
  onView,
  onSelect,
  isSelected,
  isSelectionMode,
}) => {
  const [isHovered, setIsHovered] = React.useState(false)
  const [isTapped, setIsTapped] = React.useState(false)
  const longPressTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()

  const isMetaOpen = isHovered || isTapped

  const handleRemoveTag = async (tagToRemove: string) => {
    const nextTags = (media.manualTags || []).filter(
      (t) => (typeof t === 'string' ? t : t.tag) !== tagToRemove,
    )
    try {
      const result = await updateMediaAction(media.id, { manualTags: nextTags })
      if (result.success) {
        toast.success(`Tag "${tagToRemove}" removed`)
        router.refresh()
      }
    } catch {
      toast.error('Failed to remove tag')
    }
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isSelectionMode || isSelected) {
      onSelect?.(media.id)
      return
    }
    // On touch: first tap opens panel, second navigates
    if (isTapped) {
      setIsTapped(false)
      onView?.()
    } else {
      onView?.()
    }
  }

  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => {
      onSelect?.(media.id)
    }, 500)
  }

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const handleTouchMove = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (isSelectionMode) onSelect?.(media.id)
      else onView?.()
    }
    if (e.key === ' ') {
      e.preventDefault()
      onSelect?.(media.id)
    }
  }

  const title = media.alt || media.filename || 'Untitled Archive'
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
  const bestUrl = media.thumbnailUrl || media.proxyUrl || media.originalUrl || media.url
  const src = bestUrl?.startsWith('http') ? bestUrl : `${serverUrl}${bestUrl || ''}`

  const hasTechnical = !!(media.technical?.cameraModel || media.technical?.iso)
  const isFailed = media.ingestionStatus === 'failed'

  return (
    <motion.article
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      // Desktop click
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="article"
      aria-label={title}
      style={{
        aspectRatio: media.width && media.height ? `${media.width} / ${media.height}` : '4 / 3',
      }}
      className={cn(
        'group relative w-full rounded-[24px] overflow-hidden cursor-pointer',
        'bg-gallery-surface dark:bg-[#0a0c10]',
        'transition-all duration-500',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gallery-gold',
        isSelected
          ? 'ring-2 ring-gallery-gold/60 ring-offset-1 shadow-[0px_20px_40px_rgba(26,28,28,0.12)]'
          : 'shadow-sm hover:shadow-[0px_20px_40px_rgba(26,28,28,0.12)]',
      )}
    >
      {/* 1. Primary asset image */}
      {(bestUrl || isFailed) && (
        <Image
          src={isFailed ? tempAsset : src}
          alt={title}
          fill
          unoptimized={!isFailed}
          className={cn(
            'object-cover transition-transform duration-700',
            isFailed ? 'opacity-30 grayscale' : isMetaOpen ? 'scale-[1.02]' : 'scale-100',
          )}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
        />
      )}

      {/* 2. Top badges + unified right-slot (pedigree icon OR checkbox) */}
      <CardTopBadges
        media={media}
        hasTechnical={hasTechnical}
        showCheckbox={isSelectionMode || isHovered}
        isSelected={isSelected}
        onSelect={() => onSelect?.(media.id)}
        title={title}
      />

      {/* 4. Slide-up metadata panel (hover / tap) */}
      <CardMetadataPanel
        media={media}
        title={title}
        isOpen={isMetaOpen}
        onView={onView}
        onRemoveTag={handleRemoveTag}
      />

      {/* 5. Identity bar (always visible, hides when panel is open) */}
      <CardIdentityBar media={media} title={title} visible={!isMetaOpen} />
    </motion.article>
  )
}
