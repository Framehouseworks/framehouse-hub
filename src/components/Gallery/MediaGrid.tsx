'use client'

import React, { useEffect, useState } from 'react'
import { MediaCard } from './MediaCard'
import { MediaDetailModal } from './MediaDetailModal'
import type { Media } from '@/payload-types'
import { useUpload } from '@/providers/UploadProvider'
import { useRouter } from 'next/navigation'
import { Plus, LayoutGrid, List, CheckSquare, Trash2, Edit3, X as CloseIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/utilities/cn'
import { bulkDeleteMediaAction } from '@/app/(dashboard)/actions/media'
import { toast } from 'sonner'

interface MediaGridProps {
  initialMedia: Media[]
}

export const MediaGrid: React.FC<MediaGridProps> = ({ initialMedia }) => {
  const { queue, openPicker } = useUpload()
  const router = useRouter()
  const [localMedia, setLocalMedia] = useState<Media[]>(initialMedia)
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Selection Mode State
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set())

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return

    const confirmDelete = window.confirm(
      `Are you sure you want to permanently delete ${selectedIds.size} assets? This action cannot be undone.`,
    )
    if (!confirmDelete) return

    setIsDeleting(true)
    try {
      const idsToDelete = Array.from(selectedIds).map((id) => id.toString())
      const result = await bulkDeleteMediaAction(idsToDelete)

      if (result.success) {
        toast.success(result.message)
        clearSelection()
        router.refresh()
      } else {
        toast.error(result.message || 'Failed to delete assets')
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
    } finally {
      setIsDeleting(false)
    }
  }

  const toggleSelection = (id: string | number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleCardClick = (item: Media) => {
    if (isSelectionMode) {
      toggleSelection(item.id)
    } else {
      setSelectedMedia(item)
    }
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
    setIsSelectionMode(false)
  }

  // Listen for queue completion to refresh the data
  useEffect(() => {
    const hasActiveUploads = queue.some(
      (item) => item.status === 'uploading' || item.status === 'pending',
    )

    if (!hasActiveUploads && queue.length > 0) {
      router.refresh()
    }
  }, [queue, router])

  useEffect(() => {
    setLocalMedia(initialMedia)
  }, [initialMedia])

  return (
    <>
      {/* 1. Integrated Gallery Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-primary">Creative Archive</h1>
          <p className="text-sm text-on-surface/40 font-varela mt-1">
            Your centralized stage for high-resolution creative work and visual metadata.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => {
              if (isSelectionMode) clearSelection()
              else setIsSelectionMode(true)
            }}
            className={cn(
              'h-10 px-4 rounded-xl gap-2 font-medium transition-all',
              isSelectionMode
                ? 'bg-gallery-gold/10 text-gallery-gold'
                : 'text-on-surface/40 hover:text-primary',
            )}
          >
            <CheckSquare size={16} />
            <span>{isSelectionMode ? 'Cancel Selection' : 'Select'}</span>
          </Button>

          <div className="flex bg-black/[0.03] dark:bg-white/[0.03] p-1 rounded-xl mr-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg bg-white dark:bg-white/10 shadow-sm text-gallery-gold"
            >
              <LayoutGrid size={16} />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-on-surface/40">
              <List size={16} />
            </Button>
          </div>

          <Button
            variant="gallery"
            className="h-10 px-6 rounded-full gap-2 shadow-sm"
            onClick={openPicker}
          >
            <Plus size={18} />
            <span>Ingest New Work</span>
          </Button>
        </div>
      </div>

      {/* 2. Media Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {localMedia.map((item) => (
          <div key={item.id} className="relative group">
            <MediaCard media={item} onClick={() => handleCardClick(item)} />
            {/* Selection Overlay */}
            <AnimatePresence>
              {(isSelectionMode || selectedIds.has(item.id)) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => toggleSelection(item.id)}
                  className={cn(
                    'absolute inset-0 z-30 rounded-[24px] border-2 transition-all cursor-pointer pointer-events-none',
                    selectedIds.has(item.id)
                      ? 'border-gallery-gold bg-gallery-gold/5'
                      : 'border-white/20 hover:border-white/40',
                  )}
                >
                  <div
                    className={cn(
                      'absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all',
                      selectedIds.has(item.id)
                        ? 'bg-gallery-gold border-gallery-gold text-white'
                        : 'bg-black/20 border-white/40',
                    )}
                  >
                    {selectedIds.has(item.id) && <CheckSquare size={12} />}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* 3. Selection Toolbar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[110]"
          >
            <div className="bg-white/90 dark:bg-[#0a0c10]/90 backdrop-blur-2xl border border-black/[0.05] dark:border-white/[0.1] rounded-3xl p-3 px-6 shadow-2xl flex items-center gap-6">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold tracking-widest text-gallery-gold uppercase font-rubik">
                  Selection
                </span>
                <span className="text-xs font-semibold text-primary">
                  {selectedIds.size} Assets Selected
                </span>
              </div>

              <div className="h-8 w-px bg-black/[0.05] dark:bg-white/[0.05]" />

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  className="h-10 rounded-2xl gap-2 text-on-surface/60 hover:text-primary"
                >
                  <Edit3 size={16} />
                  <span>Batch Edit</span>
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                  className="h-10 rounded-2xl gap-2 text-red-500 hover:bg-red-500/10"
                >
                  <Trash2 size={16} />
                  <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
                </Button>
              </div>

              <div className="h-8 w-px bg-black/[0.05] dark:bg-white/[0.05]" />

              <Button
                variant="ghost"
                size="icon"
                onClick={clearSelection}
                className="h-10 w-10 rounded-2xl text-on-surface/30 hover:text-primary"
              >
                <CloseIcon size={18} />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <MediaDetailModal
        isOpen={!!selectedMedia}
        media={selectedMedia}
        onClose={() => setSelectedMedia(null)}
      />
    </>
  )
}
