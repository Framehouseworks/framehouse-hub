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
  onView?: (media: Media) => void
  onSelect?: (id: string | number) => void
  isSelected?: boolean
  isSelectionMode?: boolean
}

// Height thresholds (px) for panel content tiers.
// xs  < 160 → footer only
// sm  160–220 → footer + camera row
// md  220–300 → footer + camera + exposure
// lg  > 300   → all content
type CardSize = 'xs' | 'sm' | 'md' | 'lg'

function useCardSize(ref: React.RefObject<HTMLElement | null>): CardSize {
  const [height, setHeight] = React.useState(0)
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setHeight(entry.contentRect.height))
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  if (height < 160) return 'xs'
  if (height < 220) return 'sm'
  if (height < 300) return 'md'
  return 'lg'
}

const MediaCardComponent: React.FC<Props> = ({
  media,
  onView,
  onSelect,
  isSelected,
  isSelectionMode,
}) => {
  const [isHovered, setIsHovered] = React.useState(false)
  const [isTapped, setIsTapped] = React.useState(false)
  const longPressTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const cardRef = React.useRef<HTMLElement>(null)
  const cardSize = useCardSize(cardRef)
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
      onView?.(media)
    } else {
      onView?.(media)
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
      else onView?.(media)
    }
    if (e.key === ' ') {
      e.preventDefault()
      onSelect?.(media.id)
    }
  }

  const title = media.alt || media.filename || 'Untitled Archive'
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
  const isFailed = media.ingestionStatus === 'failed'
  const isReady = media.ingestionStatus === 'ready'
  const hasTechnical = !!(media.technical?.cameraModel || media.technical?.iso)

  // Never load originalUrl for unprocessed assets — thumbnails only until ready.
  // Falling back to the original on a processing asset means loading multi-MB RAW
  // files for every card in a 1000+ asset gallery.
  const safeUrl = isFailed
    ? null
    : media.thumbnailUrl ||
      media.proxyUrl ||
      // Only allow original fallback once the worker has finished
      (isReady ? media.originalUrl || media.url : null)

  const src = safeUrl ? (safeUrl.startsWith('http') ? safeUrl : `${serverUrl}${safeUrl}`) : null

  return (
    <motion.article
      ref={cardRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="article"
      aria-label={title}
      style={{
        aspectRatio: (() => {
          if (!media.width || !media.height) return '4 / 3'
          // Floor at 3:4 (0.75): prevents excessively tall portrait cards.
          // object-fit: cover handles the proportional crop. Landscape/square unaffected.
          return String(Math.max(media.width / media.height, 0.75))
        })(),
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
      {/* 1. Primary asset — image when available, skeleton when not yet processed */}
      {src || isFailed ? (
        <Image
          src={isFailed ? tempAsset : src!}
          alt={title}
          fill
          loading="lazy"
          unoptimized={!isFailed}
          className={cn(
            'object-cover transition-transform duration-700',
            isFailed ? 'opacity-30 grayscale' : isMetaOpen ? 'scale-[1.02]' : 'scale-100',
          )}
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
        />
      ) : (
        // No thumbnail yet — skeleton prevents loading massive originals
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, hsl(var(--gallery-surface)/0.6) 25%, hsl(var(--gallery-surface)/1) 50%, hsl(var(--gallery-surface)/0.6) 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 2s linear infinite',
          }}
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
        cardSize={cardSize}
        onView={onView}
        onRemoveTag={handleRemoveTag}
      />

      {/* 5. Identity bar (always visible, hides when panel is open) */}
      <CardIdentityBar media={media} title={title} visible={!isMetaOpen} />
    </motion.article>
  )
}

// Memoised: only re-renders when isSelected, isSelectionMode, or media reference changes.
// Keeps re-render cost O(changed cards) rather than O(all visible cards) on any selection.
export const MediaCard = React.memo(MediaCardComponent)
