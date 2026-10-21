'use client'

import { cn } from '@/utilities/cn'
import { ExternalLink } from 'lucide-react'
import React from 'react'
import type { TransferWallpaperCreditBadgeProps } from './types'

/**
 * TransferWallpaperCreditBadge
 *
 * Unobtrusive credit badge positioned in screen corner.
 * Conforms strictly to DESIGN.md "The Curated Gallery":
 * - Glassmorphism: surface/black backdrop with 70% opacity and 20px blur
 * - Category/Sponsorship tag in Rubik Mono One
 * - Artist attribution in Geist
 * - Ghost border for subtle accessibility contrast
 * - Valid external link navigation (rel="noopener noreferrer")
 */
export const TransferWallpaperCreditBadge: React.FC<TransferWallpaperCreditBadgeProps> = ({
  wallpaper,
  className,
}) => {
  if (!wallpaper) return null

  const isSponsored = wallpaper.sponsorshipStatus === 'sponsored'

  const content = (
    <div
      className={cn(
        'group flex items-center gap-2 px-3 py-1.5 rounded-full',
        'bg-white/50 dark:bg-black/65 backdrop-blur-xl',
        'border border-white/10 dark:border-white/5',
        'shadow-[0px_8px_24px_rgba(0,0,0,0.15)]',
        'transition-all duration-300 hover:bg-white/70 dark:hover:bg-black/70 hover:border-whiste/20',
        className,
      )}
    >
      {isSponsored && (
        <span className="font-rubik text-[8.5px] uppercase tracking-wider text-gallery-gold px-1.5 py-0.5 rounded-sm bg-gallery-gold/15">
          Sponsored
        </span>
      )}

      <div className="flex items-center gap-1.5 min-w-0">
        <span className="font-sans text-xs font-semibold text-black/95 dark:text-white/95 truncate max-w-[130px] sm:max-w-[180px]">
          {wallpaper.artistCredit}
        </span>
        <span className="text-black/40 dark:text-white/40 text-[10px]">•</span>
        <span className="font-sans text-xs text-black/75 dark:text-white/75 truncate max-w-[140px] sm:max-w-[200px]">
          {wallpaper.title}
        </span>
      </div>

      {wallpaper.clickThroughUrl && (
        <ExternalLink
          size={12}
          className="text-black/40 dark:text-white/40 group-hover:text-black/90 dark:group-hover:text-white/90 transition-colors shrink-0 ml-0.5"
          aria-hidden="true"
        />
      )}
    </div>
  )

  if (wallpaper.clickThroughUrl) {
    return (
      <a
        href={wallpaper.clickThroughUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block pointer-events-auto outline-none focus-visible:ring-2 focus-visible:ring-gallery-gold rounded-full"
        aria-label={`${wallpaper.artistCredit} - ${wallpaper.title}${isSponsored ? ' (Sponsored)' : ''} (opens in new tab)`}
      >
        {content}
      </a>
    )
  }

  return <div className="inline-block pointer-events-auto">{content}</div>
}
