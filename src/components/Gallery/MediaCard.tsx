'use client'

import type { Media } from '@/payload-types'
import { cn } from '@/utilities/cn'
import { AnimatePresence, motion } from 'framer-motion'
import { Camera, Zap, Tag as TagIcon, X as CloseIcon, Plus, Edit3 } from 'lucide-react'
import Image from 'next/image'
import React, { useState } from 'react'
import { updateMediaAction } from '@/app/(dashboard)/actions/media'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

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
  const [tagInput, setTagInput] = useState('')
  const router = useRouter()

  const handleAddTag = async () => {
    if (!tagInput.trim()) return
    const newTag = tagInput.trim().toLowerCase()
    const currentTags = media.manualTags?.map((t) => (typeof t === 'string' ? t : t.tag)) || []

    if (currentTags.includes(newTag)) {
      setTagInput('')
      return
    }

    try {
      const result = await updateMediaAction(media.id, {
        manualTags: [...(media.manualTags || []), { tag: newTag }],
      })
      if (result.success) {
        toast.success(`Tag "${newTag}" transactionally applied`)
        setTagInput('')
        router.refresh()
      }
    } catch {
      toast.error('Failed to apply archival tag')
    }
  }

  const handleRemoveTag = async (tagToRemove: string) => {
    const nextTags = (media.manualTags || []).filter(
      (t) => (typeof t === 'string' ? t : t.tag) !== tagToRemove,
    )

    try {
      const result = await updateMediaAction(media.id, {
        manualTags: nextTags,
      })
      if (result.success) {
        toast.success(`Tag "${tagToRemove}" transactionally purged`)
        router.refresh()
      }
    } catch {
      toast.error('Failed to purge archival tag')
    }
  }

  const title = media.alt || media.filename || 'Untitled Archive'
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
  const src = media.url?.startsWith('http') ? media.url : `${serverUrl}${media.url}`

  const hasTechnical = !!(media.technical?.cameraModel || media.technical?.iso)
  const isProcessing = media.ingestionStatus === 'processing' || media.ingestionStatus === 'active'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        e.stopPropagation()
        if (isSelectionMode || isSelected) {
          onSelect?.(media.id)
        } else {
          onView?.()
        }
      }}
      className={cn(
        'group relative aspect-[4/5] rounded-[24px] bg-gallery-surface dark:bg-[#0a0c10] overflow-hidden border transition-all duration-500 cursor-pointer',
        isSelected
          ? 'border-gallery-gold ring-4 ring-gallery-gold/10'
          : 'border-black/[0.03] dark:border-white/[0.03] hover:border-gallery-gold/30 shadow-sm hover:shadow-xl',
      )}
    >
      {/* 1. Primary Asset */}
      {media.url && (
        <Image
          src={src}
          alt={title}
          fill
          unoptimized
          className={cn(
            'object-cover transition-all duration-700',
            isHovered ? 'blur-[2px] opacity-40' : 'opacity-100',
          )}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
        />
      )}

      {/* 2. Top Badges (Status & Tags) */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
        <div className="flex flex-wrap gap-2">
          {isProcessing ? (
            <div className="px-3 py-1 rounded-full bg-gallery-gold/10 backdrop-blur-md border border-gallery-gold/20 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-gallery-gold animate-pulse" />
              <span className="font-rubik text-[9px] tracking-wider text-gallery-gold uppercase">
                Processing
              </span>
            </div>
          ) : (
            media.manualTags?.[0] && (
              <div className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10">
                <span className="font-rubik text-[9px] tracking-wider text-white uppercase opacity-80">
                  {media.manualTags[0].tag}
                </span>
              </div>
            )
          )}
        </div>

        {hasTechnical && (
          <div className="p-2 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white/60">
            <Zap size={14} />
          </div>
        )}
      </div>

      {/* 3. Hover Overlay: Technical Pedigree */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex flex-col justify-end p-6 bg-gradient-to-t from-black/90 via-black/40 to-transparent text-white"
          >
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="space-y-4"
            >
              {/* 1. Quick Tagging Hub */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-gallery-gold">
                  <TagIcon size={14} />
                  <span className="text-[10px] font-bold tracking-widest uppercase font-rubik">
                    Quick Tags
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {((media.manualTags || []) as { tag?: string }[]).map((tagData, idx: number) => {
                    const tag = typeof tagData === 'string' ? tagData : tagData.tag
                    if (!tag) return null

                    return (
                      <div
                        key={idx}
                        className="px-2 py-0.5 rounded bg-white/20 backdrop-blur-md text-[9px] font-medium flex items-center gap-1 group/tag"
                      >
                        {tag}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveTag(tag)
                          }}
                          className="opacity-0 group-hover/tag:opacity-100 hover:text-red-400 transition-all"
                        >
                          <CloseIcon size={10} />
                        </button>
                      </div>
                    )
                  })}
                </div>

                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    placeholder="Add tag..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        e.stopPropagation()
                        handleAddTag()
                      }
                    }}
                    className="w-full h-8 bg-white/10 border border-white/20 rounded-lg px-3 text-[10px] focus:outline-none focus:ring-1 focus:ring-gallery-gold/50 transition-all placeholder:text-white/30"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAddTag()
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-1"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* 2. Technical Group (Existing) */}
              {hasTechnical && (
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <div className="flex items-center gap-2 text-gallery-gold/60">
                    <Camera size={14} />
                    <span className="text-[10px] font-bold tracking-widest uppercase font-rubik">
                      Archival Data
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                    {media.technical?.cameraModel && (
                      <div className="flex flex-col">
                        <span className="text-[8px] text-white/40 uppercase font-rubik">Body</span>
                        <span className="text-[11px] font-medium truncate">
                          {media.technical.cameraModel}
                        </span>
                      </div>
                    )}
                    {media.technical?.iso && (
                      <div className="flex flex-col">
                        <span className="text-[8px] text-white/40 uppercase font-rubik">ISO</span>
                        <span className="text-[11px] font-medium">{media.technical.iso}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Title & Metadata */}
              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold truncate mb-0.5">{title}</h3>
                  <p className="text-[10px] text-white/40 font-varela uppercase tracking-wider">
                    {media.accessionId || 'ARCHIVE'}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onView?.()
                  }}
                  className="p-2 rounded-full bg-gallery-gold text-white shadow-lg hover:scale-110 transition-all"
                >
                  <Edit3 size={14} />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Bottom Identity (Default View) */}
      <AnimatePresence>
        {!isHovered && (
          <div className="absolute bottom-0 left-0 right-0 p-6 z-10 ">
            <motion.div
              initial={{ opacity: 0, y: 0 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="bg-white/90 dark:bg-black/60 p-4 backdrop-blur-xl rounded-2xl shadow-sm flex items-center justify-between gap-2"
            >
              <div className="min-w-0 flex-1">
                <h3 className="text-xs font-semibold text-primary truncate mb-1 font-rubik">
                  {title}
                </h3>
                <p className="text-[10px] text-on-surface/40 font-varela truncate uppercase tracking-wider">
                  {media.mediaType || 'Image'} &bull;{' '}
                  {new Date(media.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onView?.()
                }}
                className="md:hidden p-2 rounded-full bg-gallery-gold/10 hover:bg-gallery-gold/20 text-gallery-gold transition-colors flex-shrink-0"
                title="Edit Archival Details"
              >
                <Edit3 size={12} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
