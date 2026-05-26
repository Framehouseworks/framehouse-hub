'use client'

import type { Media } from '@/payload-types'
import { cn } from '@/utilities/cn'
import { AnimatePresence, motion } from 'framer-motion'
import { Camera, Edit3, Tag as TagIcon, X as CloseIcon } from 'lucide-react'
import React from 'react'

type CardSize = 'xs' | 'sm' | 'md' | 'lg'

interface Props {
  media: Media
  title: string
  isOpen: boolean
  cardSize: CardSize
  onView?: () => void
  onRemoveTag: (tag: string) => void
}

export const CardMetadataPanel: React.FC<Props> = ({
  media,
  title,
  isOpen,
  cardSize,
  onView,
  onRemoveTag,
}) => {
  const tech = media.technical
  const hasTechnical = !!(tech?.cameraModel || tech?.iso)
  const hasExposure = !!(tech?.iso || tech?.aperture || tech?.shutterSpeed || tech?.focalLength)
  const tags = (media.manualTags || []) as { tag?: string | null; id?: string | null }[]
  const visibleTags = tags.slice(0, 3)
  const extraCount = tags.length - 3

  // Progressively reveal rows based on available card height
  const showCamera = hasTechnical && cardSize !== 'xs'
  const showExposure = hasExposure && (cardSize === 'md' || cardSize === 'lg')
  const showTags = tags.length > 0 && cardSize === 'lg'
  const hasContent = showCamera || showExposure || showTags

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="metadata-panel"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'tween', duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
          className="absolute bottom-0 left-0 right-0 z-20 bg-black/80 backdrop-blur-xl rounded-t-[20px]"
          role="region"
          aria-label={`Metadata for ${title}`}
        >
          <div className={cn('px-4 pt-4', hasContent ? 'pb-3 space-y-3' : 'pb-4')}>
            {/* Camera body + lens */}
            {showCamera && (
              <div className="flex items-center gap-2.5">
                <Camera size={13} className="text-amber-400/70 flex-shrink-0" aria-hidden="true" />
                <div className="min-w-0">
                  {tech?.cameraModel && (
                    <p className="text-[12px] font-medium text-white/90 truncate leading-snug">
                      {tech.cameraModel}
                    </p>
                  )}
                  {tech?.lensModel && (
                    <p className="text-[10px] text-white/45 truncate font-sans">{tech.lensModel}</p>
                  )}
                </div>
              </div>
            )}

            {/* Exposure row */}
            {showExposure && (
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {tech?.iso && (
                  <span className="flex items-baseline gap-1">
                    <span className="text-[9px] text-white/35 uppercase tracking-widest font-rubik">
                      ISO
                    </span>
                    <span className="text-[11px] font-mono text-white/80">{tech.iso}</span>
                  </span>
                )}
                {tech?.aperture && (
                  <span className="flex items-baseline gap-0.5">
                    <span className="text-[9px] text-white/35 font-rubik">ƒ/</span>
                    <span className="text-[11px] font-mono text-white/80">{tech.aperture}</span>
                  </span>
                )}
                {tech?.shutterSpeed && (
                  <span className="text-[11px] font-mono text-white/80">{tech.shutterSpeed}</span>
                )}
                {tech?.focalLength && (
                  <span className="text-[11px] font-mono text-white/80">{tech.focalLength}mm</span>
                )}
              </div>
            )}

            {/* Tags */}
            {showTags && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <TagIcon size={10} className="text-white/30 flex-shrink-0" aria-hidden="true" />
                {visibleTags.map((tagData, idx) => {
                  const tag = typeof tagData === 'string' ? tagData : tagData.tag
                  if (!tag) return null
                  return (
                    <span
                      key={idx}
                      className="group/tag inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/10 text-[10px] text-white/70"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onRemoveTag(tag)
                        }}
                        aria-label={`Remove tag ${tag}`}
                        className={cn(
                          'opacity-0 group-hover/tag:opacity-100 hover:text-red-400 transition-opacity',
                          'focus-visible:opacity-100 focus-visible:outline-none',
                          'min-w-[16px] min-h-[16px] flex items-center justify-center',
                        )}
                      >
                        <CloseIcon size={9} aria-hidden="true" />
                      </button>
                    </span>
                  )
                })}
                {extraCount > 0 && (
                  <span className="px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-medium text-amber-400/80">
                    +{extraCount}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Footer: accession ID + edit action */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.08]">
            <span className="text-[9px] text-white/30 uppercase tracking-widest font-rubik">
              {media.accessionId || media.mediaType || 'Asset'}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onView?.()
              }}
              aria-label={`Open ${title}`}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full',
                'bg-gallery-gold text-white text-[10px] font-semibold',
                'hover:brightness-110 active:scale-95 transition-all',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gallery-gold/60',
                'min-h-[32px]',
              )}
            >
              <Edit3 size={11} aria-hidden="true" />
              Edit
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
