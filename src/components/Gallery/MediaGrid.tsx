'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { MediaCard } from './MediaCard'
import { ForensicDrawer } from './ForensicDrawer'
import type { Media } from '@/payload-types'
import { useDebounce } from '@/hooks/useDebounce'
import { useUpload } from '@/providers/UploadProvider'
import { useRouter } from 'next/navigation'
import { Plus, CheckSquare, Trash2, Edit3, X as CloseIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/utilities/cn'
import { BulkEditTagsModal } from './BulkEditTagsModal'
import { SafetyLockDeleteModal } from './SafetyLockDeleteModal'
import { SaveViewModal } from './SaveViewModal'
import { EmptyState } from './EmptyState'
import { bulkDeleteMediaAction, createSmartCollectionAction } from '@/app/(dashboard)/actions/media'
import { toast } from 'sonner'
import { VirtuosoGrid } from 'react-virtuoso'
import { Search, Save } from 'lucide-react'
import { Input } from '@/components/ui/input'

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

  // Discovery & Filtering State
  const [searchQuery, setSearchQuery] = useState(initialFilters?.search || '')
  const [statusFilter, setStatusFilter] = useState<string | null>(initialFilters?.status || null)
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  // Server-side search hits (FRH-52 phase C). When debouncedSearchQuery is
  // non-empty, /api/media/search returns the GIN-ranked matches and we
  // render those instead of substring-filtering localMedia. Falls back to
  // localMedia for empty query.
  const [searchHits, setSearchHits] = useState<Media[] | null>(null)
  useEffect(() => {
    let cancelled = false
    if (!debouncedSearchQuery) {
      setSearchHits(null)
      return
    }
    ;(async () => {
      try {
        const url = `/api/media/search?q=${encodeURIComponent(debouncedSearchQuery)}&limit=50`
        const res = await fetch(url, { cache: 'no-store' })
        if (!res.ok) {
          setSearchHits(null)
          return
        }
        const data = (await res.json()) as { docs?: Media[] }
        if (!cancelled) setSearchHits(data.docs || [])
      } catch {
        if (!cancelled) setSearchHits(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [debouncedSearchQuery])

  // Synchronize state when server initialFilters change (e.g., clicking active views)
  useEffect(() => {
    setSearchQuery(initialFilters?.search || '')
    setStatusFilter(initialFilters?.status || null)
  }, [initialFilters?.search, initialFilters?.status])

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

  const filteredMedia = useMemo(() => {
    // When a query is active, use the server-side FTS hits as the
    // source. The endpoint already filters by owner + matches against
    // title / filename / originalFilename / camera / lens / shootName
    // via the GIN index. We only layer the status filter on top.
    const source = searchHits ?? localMedia
    return source.filter((item) => {
      const matchesStatus = !statusFilter || item.ingestionStatus === statusFilter
      return matchesStatus
    })
  }, [localMedia, searchHits, statusFilter])

  const handleClearFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
  }

  const handleSaveViewAction = async (data: { name: string; icon: string }) => {
    try {
      const result = await createSmartCollectionAction({
        name: data.name,
        filterQuery: {
          search: searchQuery,
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
        <div className="relative flex-1 group">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface/30 group-focus-within:text-gallery-gold transition-colors"
            size={18}
          />
          <Input
            placeholder="Discover by title, filename, or shoot batch..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              'h-12 pl-12 bg-gallery-surface/50 dark:bg-white/[0.03] border-black/[0.05] dark:border-white/[0.05] rounded-2xl focus:ring-gallery-gold/20 focus:border-gallery-gold/30 transition-all text-sm font-varela',
              searchQuery !== debouncedSearchQuery ? 'pr-10' : 'pr-4',
            )}
          />
          <AnimatePresence>
            {searchQuery !== debouncedSearchQuery && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gallery-gold/65 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-gallery-gold"></span>
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-2 p-1 bg-black/[0.03] dark:bg-white/[0.03] rounded-2xl">
          {['ready', 'processing', 'failed'].map((status) => (
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

        {(searchQuery || statusFilter) && (
          <div className="flex flex-col items-end gap-1">
            <Button
              variant="outline"
              onClick={() => setIsSaveViewOpen(true)}
              className="h-12 px-6 rounded-2xl border-dashed border-gallery-gold/30 text-gallery-gold hover:bg-gallery-gold/5 flex items-center gap-2 font-semibold"
              title={`Save view parameters: ${statusFilter ? `Status=${statusFilter}` : ''}${searchQuery && statusFilter ? ' + ' : ''}${searchQuery ? `Search='${searchQuery}'` : ''}`}
            >
              <Save size={16} />
              <span>Save View</span>
            </Button>
            <span className="text-[8px] font-bold uppercase tracking-wider text-on-surface/30 font-varela pr-2">
              {statusFilter ? `Status:${statusFilter}` : ''}
              {searchQuery && statusFilter ? ' + ' : ''}
              {searchQuery ? `Query:${searchQuery}` : ''}
            </span>
          </div>
        )}
      </div>

      {/* 2. Media Grid (Virtualized for 1000+ assets) */}
      <div className="flex-1 min-h-[600px]">
        {filteredMedia.length > 0 ? (
          <VirtuosoGrid
            data={filteredMedia}
            totalCount={filteredMedia.length}
            useWindowScroll
            listClassName="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6 p-1"
            components={{
              Item: VirtuosoItem,
            }}
            itemContent={(index, item) => (
              <>
                <MediaCard
                  key={item.id}
                  media={item}
                  isSelected={selectedIds.has(item.id)}
                  onSelect={(id) => toggleSelection(id)}
                  onView={() => setSelectedMedia(item)}
                  isSelectionMode={isSelectionMode || selectedIds.size > 0}
                />
                {/* Selection Overlay for high-visibility */}
                <AnimatePresence>
                  {(isSelectionMode || selectedIds.has(item.id)) && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => toggleSelection(item.id)}
                      className={cn(
                        'absolute inset-0 z-30 rounded-[24px] border-2 transition-all cursor-pointer',
                        selectedIds.has(item.id)
                          ? 'border-gallery-gold bg-gallery-gold/5'
                          : 'border-white/20 hover:border-white/40',
                      )}
                    >
                      <div
                        className={cn(
                          'absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all',
                          selectedIds.has(item.id)
                            ? 'bg-gallery-gold border-gallery-gold text-white shadow-lg'
                            : 'bg-black/20 border-white/40',
                        )}
                      >
                        {selectedIds.has(item.id) && <CheckSquare size={12} />}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
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

const VirtuosoItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ children, ...props }, ref) => (
    <div ref={ref} {...props} className="relative group min-h-[400px]">
      {children}
    </div>
  ),
)
VirtuosoItem.displayName = 'VirtuosoItem'
