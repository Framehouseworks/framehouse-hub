'use client'

import type { Media } from '@/payload-types'
import { cn } from '@/utilities/cn'
import { motion } from 'framer-motion'
import { Camera } from 'lucide-react'
import React from 'react'

interface Props {
  media: Media
  hasTechnical: boolean
  showCheckbox?: boolean
  isSelected?: boolean
  onSelect?: () => void
  title?: string
}

export const CardTopBadges: React.FC<Props> = ({
  media,
  hasTechnical,
  showCheckbox,
  isSelected,
  onSelect,
  title,
}) => {
  const isFailed = media.ingestionStatus === 'failed'
  const isProcessing = media.ingestionStatus === 'processing' || media.ingestionStatus === 'active'
  const isRaw = media.mediaType === 'raw'

  return (
    <div
      className="absolute top-3 left-3 right-3 flex justify-between items-start z-10"
      aria-hidden="true"
    >
      {/* Left: status / type badge */}
      <div className="flex flex-wrap gap-1.5">
        {isFailed ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="px-2.5 py-1 rounded-full bg-red-500/20 backdrop-blur-md border border-red-400/30 shadow-sm flex items-center gap-1.5"
            aria-label="Failed"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
            <span className="font-rubik text-[9px] tracking-wider text-red-400 uppercase font-semibold">
              Failed
            </span>
          </motion.div>
        ) : isProcessing ? (
          <motion.div
            className="px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-amber-400/30 flex items-center gap-1.5 shadow-sm"
            animate={{
              borderColor: ['rgba(251,191,36,0.3)', 'rgba(251,191,36,0.7)', 'rgba(251,191,36,0.3)'],
            }}
            transition={{ duration: 2, repeat: Infinity }}
            aria-label="Processing"
          >
            <motion.div
              className="w-1.5 h-1.5 rounded-full bg-amber-400"
              animate={{ scale: [1, 1.4, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            <span className="font-rubik text-[9px] tracking-wider text-amber-400 uppercase font-semibold">
              Processing
            </span>
          </motion.div>
        ) : isRaw ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
              'px-2.5 py-1 rounded-full backdrop-blur-md shadow-sm',
              'bg-gallery-gold/20 border border-gallery-gold/40',
            )}
            aria-label="RAW format"
          >
            <span className="font-rubik text-[9px] tracking-wider text-gallery-gold uppercase font-bold">
              RAW
            </span>
          </motion.div>
        ) : null}
      </div>

      {/* Right: checkbox (hover/selection mode) OR pedigree icon */}
      {showCheckbox ? (
        <label
          className="cursor-pointer"
          aria-label={isSelected ? `Deselect ${title}` : `Select ${title}`}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={!!isSelected}
            onChange={() => onSelect?.()}
            className={cn(
              'w-5 h-5 rounded-md cursor-pointer appearance-none border-2 transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gallery-gold',
              isSelected
                ? 'bg-gallery-gold border-gallery-gold'
                : 'bg-black/40 border-white/50 backdrop-blur-sm',
            )}
          />
        </label>
      ) : hasTechnical ? (
        <div
          className="p-1.5 rounded-full bg-black/60 backdrop-blur-sm text-amber-400/80 shadow-sm"
          aria-label="Has camera metadata"
        >
          <Camera size={12} aria-hidden="true" />
        </div>
      ) : null}
    </div>
  )
}
