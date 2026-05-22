'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { ForensicDrawer } from './ForensicDrawer'
import type { Media } from '@/payload-types'
import { useUpload } from '@/providers/UploadProvider'
import { useRouter } from 'next/navigation'
import { Plus, CheckSquare, Trash2, Edit3, X as CloseIcon, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/utilities/cn'
import { BulkEditTagsModal } from './BulkEditTagsModal'
import { SafetyLockDeleteModal } from './SafetyLockDeleteModal'
import { SaveViewModal } from './SaveViewModal'
import { EmptyState } from './EmptyState'
import { bulkDeleteMediaAction, createSmartCollectionAction } from '@/app/(dashboard)/actions/media'
import { toast } from 'sonner'
import { TimelineStream } from './TimelineStream'
import { groupMedia, type DateMode } from '@/lib/groupMedia'

interface MediaGridProps {
  initialMedia: Media[]
  initialFilters?: {
    search?: string
    status?: string
  }
}

export const MediaGrid: React.FC<MediaGridProps> = ({ initialMedia, initialFilters }) => {
  const { queue, openPicker, hydrateServerProcessing } = useUpload()
  const router = useRouter()
  const [localMedia, setLocalMedia] = useState<Media[]>(initialMedia)
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Selection Mode State
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set())

  // Discovery & Filtering State — search is URL-driven (GlobalSearch in TopBar)
  const [statusFilter, setStatusFilter] = useState<string | null>(initialFilters?.status || null)
  const [dateMode, setDateMode] = useState<DateMode>('capture')

  // Sync status filter when server initialFilters change
  useEffect(() => {
    setStatusFilter(initialFilters?.status || null)
  }, [initialFilters?.status])

  // Modal States
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false)
  const [isSafetyLockOpen, setIsSafetyLockOpen] = useState(false)
  const [isSaveViewOpen, setIsSaveViewOpen] = useState(false)

  const handleBulkDeleteTrigger = () => {
    if (selectedIds.size === 0) return
    setIsSafetyLockOpen(true)
  }

  const handleConfirmBulkDelete = async () => {
    setIsDeleting(true)
    try {
      const idsToDelete = Array.from(selectedIds)
      const result = await bulkDeleteMediaAction(idsToDelete)

      if (result.success) {
        toast.success(result.message)
        clearSelection()
        setIsSafetyLockOpen(false)
        router.refresh()
      } else {
        toast.error(result.message || 'Failed to delete assets')
      }
    } catch (_error) {
      toast.error('An unexpected error occurred during bulk deletion')
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

  const handleSelectAll = () => {
    if (selectedIds.size === localMedia.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(localMedia.map((m) => m.id)))
    }
    setIsSelectionMode(true)
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
    setIsSelectionMode(false)
  }

  // Server already returns the search-filtered set via ?search= URL param.
  // Client only applies status filter on top.
  const filteredMedia = useMemo(() => {
    return localMedia.filter((item) => !statusFilter || item.ingestionStatus === statusFilter)
  }, [localMedia, statusFilter])

  const groups = useMemo(() => groupMedia(filteredMedia, dateMode), [filteredMedia, dateMode])

  const handleClearFilters = () => {
    setStatusFilter(null)
    router.push('/dashboard')
  }

  const handleSaveViewAction = async (data: { name: string; icon: string }) => {
    try {
      const result = await createSmartCollectionAction({
        name: data.name,
        filterQuery: {
          search: initialFilters?.search,
          status: statusFilter,
        },
        icon: data.icon as 'folder' | 'tag' | 'sparkles' | 'camera' | 'map',
      })

      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    } catch (_error) {
      toast.error('Failed to save view')
    }
  }

  // Listen for queue completion to refresh the data
  useEffect(() => {
    const hasActiveUploads = queue.some(
      (item) =>
        item.status === 'uploading' || item.status === 'pending' || item.status === 'processing',
    )

    if (!hasActiveUploads && queue.length > 0) {
      router.refresh()
    }
  }, [queue, router])

  useEffect(() => {
    setLocalMedia(initialMedia)

    const processingMedia = initialMedia.filter(
      (m) => m.ingestionStatus === 'processing' || m.ingestionStatus === 'active',
    )
    if (processingMedia.length > 0) {
      hydrateServerProcessing(
        processingMedia.map((m) => ({
          mediaId: m.id,
          filename: m.filename || m.title || 'Unknown',
          processingStep: (m.processingStep as string) || 'upload_complete',
        })),
      )
    }
  }, [initialMedia, hydrateServerProcessing])

  return (
    <>
      {/* 1. Integrated Gallery Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
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

      {/* 2. Discovery Bar */}
      <div className="flex flex-col md:flex-row items-center gap-4 mb-8">
        {/* Status filters */}
        <div className="flex items-center gap-2 p-1 bg-black/[0.03] dark:bg-white/[0.03] rounded-2xl">
          {(['ready', 'processing', 'failed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(statusFilter === status ? null : status)}
              className={cn(
                'px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all',
                statusFilter === status
                  ? 'bg-white dark:bg-white/10 text-gallery-gold shadow-sm'
                  : 'text-on-surface/30 hover:text-on-surface/60',
              )}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Date mode toggle */}
        <div className="flex items-center gap-2 p-1 bg-black/[0.03] dark:bg-white/[0.03] rounded-2xl">
          {(['capture', 'ingest'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setDateMode(mode)}
              className={cn(
                'px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all',
                dateMode === mode
                  ? 'bg-white dark:bg-white/10 text-gallery-gold shadow-sm'
                  : 'text-on-surface/30 hover:text-on-surface/60',
              )}
            >
              {mode === 'capture' ? 'Capture Date' : 'Upload Date'}
            </button>
          ))}
        </div>

        {(initialFilters?.search || statusFilter) && (
          <div className="flex flex-col items-end gap-1">
            <Button
              variant="outline"
              onClick={() => setIsSaveViewOpen(true)}
              className="h-12 px-6 rounded-2xl border-dashed border-gallery-gold/30 text-gallery-gold hover:bg-gallery-gold/5 flex items-center gap-2 font-semibold"
              title={`Save view parameters: ${statusFilter ? `Status=${statusFilter}` : ''}${initialFilters?.search && statusFilter ? ' + ' : ''}${initialFilters?.search ? `Search='${initialFilters.search}'` : ''}`}
            >
              <Save size={16} />
              <span>Save View</span>
            </Button>
            <span className="text-[8px] font-bold uppercase tracking-wider text-on-surface/30 font-varela pr-2">
              {statusFilter ? `Status:${statusFilter}` : ''}
              {initialFilters?.search && statusFilter ? ' + ' : ''}
              {initialFilters?.search ? `Query:${initialFilters.search}` : ''}
            </span>
          </div>
        )}
      </div>

      {/* 3. Timeline Stream */}
      <div className="flex-1 min-h-[600px]">
        {filteredMedia.length > 0 ? (
          <TimelineStream
            groups={groups}
            dateMode={dateMode}
            selectedIds={selectedIds}
            isSelectionMode={isSelectionMode}
            onSelect={toggleSelection}
            onView={(media) => setSelectedMedia(media)}
          />
        ) : (
          <EmptyState mode="no-results" onClearFilters={handleClearFilters} />
        )}
      </div>

      {/* 3. Selection Toolbar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[110]"
          >
            <div className="bg-white/90 dark:bg-[#0a0c10]/90 backdrop-blur-2xl border border-black/[0.05] dark:border-white/[0.1] rounded-[32px] p-4 px-8 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] flex items-center gap-8 min-w-[500px]">
              <div className="flex flex-col min-w-[120px]">
                <span className="text-[10px] font-bold tracking-widest text-gallery-gold uppercase font-rubik leading-none mb-1">
                  Selection
                </span>
                <span className="text-sm font-semibold text-primary">
                  {selectedIds.size === localMedia.length
                    ? 'All Assets'
                    : `${selectedIds.size} Selected`}
                </span>
              </div>

              <div className="h-10 w-px bg-black/[0.05] dark:bg-white/[0.1]" />

              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  onClick={handleSelectAll}
                  className="h-11 rounded-2xl gap-2 text-on-surface/60 hover:text-primary px-4"
                >
                  <CheckSquare size={16} />
                  <span>
                    {selectedIds.size === localMedia.length ? 'Deselect All' : 'Select All'}
                  </span>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setIsBulkEditOpen(true)}
                  className="h-11 rounded-2xl gap-2 text-on-surface/60 hover:text-gallery-gold px-4"
                >
                  <Edit3 size={16} />
                  <span>Batch Edit</span>
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleBulkDeleteTrigger}
                  className="h-11 rounded-2xl gap-2 text-red-500 hover:bg-red-500/10 px-4"
                >
                  <Trash2 size={16} />
                  <span>Delete</span>
                </Button>
              </div>

              <div className="h-10 w-px bg-black/[0.05] dark:bg-white/[0.1]" />

              <Button
                variant="ghost"
                size="icon"
                onClick={clearSelection}
                className="h-11 w-11 rounded-2xl text-on-surface/30 hover:text-primary transition-colors"
              >
                <CloseIcon size={20} />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals & Drawers */}
      <ForensicDrawer
        isOpen={!!selectedMedia}
        media={selectedMedia}
        onClose={() => setSelectedMedia(null)}
      />

      <BulkEditTagsModal
        isOpen={isBulkEditOpen}
        onClose={() => setIsBulkEditOpen(false)}
        selectedIds={Array.from(selectedIds)}
        onSuccess={clearSelection}
      />

      <SafetyLockDeleteModal
        isOpen={isSafetyLockOpen}
        onClose={() => setIsSafetyLockOpen(false)}
        count={selectedIds.size}
        onConfirm={handleConfirmBulkDelete}
        isDeleting={isDeleting}
      />

      <SaveViewModal
        isOpen={isSaveViewOpen}
        onClose={() => setIsSaveViewOpen(false)}
        onSave={handleSaveViewAction}
      />
    </>
  )
}
