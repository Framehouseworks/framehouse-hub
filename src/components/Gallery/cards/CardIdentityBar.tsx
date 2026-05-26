'use client'

import type { Media } from '@/payload-types'
import { motion } from 'framer-motion'
import React from 'react'

interface Props {
  media: Media
  title: string
  visible: boolean
}

export const CardIdentityBar: React.FC<Props> = ({ media, title, visible }) => {
  const dateStr = media.captureDate
    ? new Date(media.captureDate).toLocaleDateString(undefined, {
        month: 'short',
        year: 'numeric',
      })
    : new Date(media.createdAt).toLocaleDateString(undefined, {
        month: 'short',
        year: 'numeric',
      })

  // Rubik Mono label — type is the "gallery label" per DESIGN.md
  const typeLabel = (media.mediaType ?? 'image').toUpperCase()

  return (
    <motion.div
      animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 4 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none rounded-b-[24px] overflow-hidden"
      aria-hidden={!visible}
    >
      {/* Gradient scrim — image fades naturally into the identity zone */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

      {/* Identity content */}
      <div className="relative px-4 pb-5 pt-10">
        {/* Asset title — Inter, the "name" of this work */}
        <p className="text-[14px] font-medium text-white/95 leading-snug truncate tracking-[-0.015em]">
          {title}
        </p>

        {/* Gallery label row — Rubik Mono as spec'd, accession anchors identity */}
        <div className="flex items-center gap-0 mt-1">
          {media.accessionId ? (
            <>
              <span className="font-rubik text-[9px] text-gallery-gold/70 tracking-wider uppercase">
                {media.accessionId}
              </span>
              <span className="mx-2 text-white/20 text-[9px]">·</span>
              <span className="font-rubik text-[9px] text-white/35 tracking-wider uppercase">
                {typeLabel}
              </span>
            </>
          ) : (
            <>
              <span className="font-rubik text-[9px] text-white/45 tracking-wider uppercase">
                {typeLabel}
              </span>
              <span className="mx-2 text-white/20 text-[9px]">·</span>
              <span className="font-rubik text-[9px] text-white/30 tracking-wide">{dateStr}</span>
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
}
