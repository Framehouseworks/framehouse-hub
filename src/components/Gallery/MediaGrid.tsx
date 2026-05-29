'use client'

import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { AssetViewer } from '@/components/AssetViewer'
import type { Media } from '@/payload-types'
import { useUpload } from '@/providers/UploadProvider'
import { useRouter } from 'next/navigation'
import { Plus, CheckSquare, Trash2, Edit3, X as CloseIcon, Save, ChevronLeft, Settings, PinOff, Bookmark } from 'lucide-react'
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
import { CollectionRuleEditor } from '@/components/SmartCollections/CollectionRuleEditor'
import { MediaPickerModal } from '@/components/SmartCollections/MediaPickerModal'
import { BulkAddToCollectionModal } from '@/components/SmartCollections/BulkAddToCollectionModal'
import { MediaCard } from './MediaCard'

/** When provided, MediaGrid renders in collection-context mode:
 *  - No "Creative Archive" header or status filter bar
 *  - Collection header with back nav, Edit Rules, Add Assets
 *  - Selection toolbar includes Remove from Collection action
 */
export interface CollectionContext {
  id: number
  name: string
  isSystemGenerated?: boolean
  manualIncludeIds: number[]
  manualIncludeDocs?: Media[]
  hasFilterQuery?: boolean
  autoMatchedCount?: number
}

interface MediaGridProps {
  initialMedia: Media[]
  initialFilters?: {
    search?: string
    status?: string
  }
  collectionContext?: CollectionContext
  /** 'library' (default) shows status filters + ingest button.
   *  'session' suppresses the entire discovery toolbar — session page owns its header. */
  variant?: 'library' | 'session'
}

export const MediaGrid: React.FC<MediaGridProps> = ({ initialMedia, initialFilters, collectionContext, variant = 'library' }) => {
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

  // Collection-context modals
  const [isRuleEditorOpen, setIsRuleEditorOpen] = useState(false)
  const [isAssetPickerOpen, setIsAssetPickerOpen] = useState(false)
  const [isBulkCollectionOpen, setIsBulkCollectionOpen] = useState(false)

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

  const toggleSelection = useCallback((id: string | number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
        // Entering selection via card checkbox activates global mode
        setIsSelectionMode(true)
      }
      return next
    })
  }, [])

  // Selects/deselects all items in a specific group atomically.
  const handleSelectGroup = useCallback((ids: (string | number)[], allSelected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        ids.forEach((id) => next.delete(id))
      } else {
        ids.forEach((id) => next.add(id))
        setIsSelectionMode(true)
      }
      return next
    })
  }, [])

  const handleView = useCallback((media: Media) => setSelectedMedia(media), [])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
    setIsSelectionMode(false)
  }, [])

  // Server already returns the search-filtered set via ?search= URL param.
  // Client only applies status filter on top.
  const filteredMedia = useMemo(() => {
    return localMedia.filter((item) => !statusFilter || item.ingestionStatus === statusFilter)
  }, [localMedia, statusFilter])

  // Scoped to filteredMedia so "Select All" only touches the current view.
  const handleSelectAll = useCallback(() => {
    const visibleIds = filteredMedia.map((m) => m.id)
    const allVisibleSelected = visibleIds.every((id) => selectedIds.has(id))
    if (allVisibleSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        visibleIds.forEach((id) => next.delete(id))
        return next
      })
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        visibleIds.forEach((id) => next.add(id))
        return next
      })
    }
    setIsSelectionMode(true)
  }, [filteredMedia, selectedIds])

  const groups = useMemo(() => groupMedia(filteredMedia, dateMode), [filteredMedia, dateMode])

  // How many selected IDs are currently visible in the filtered view.
  const selectedInView = useMemo(
    () => filteredMedia.filter((m) => selectedIds.has(m.id)).length,
    [filteredMedia, selectedIds],
  )

  const statusCounts = useMemo(() => {
    const localIds = new Set(localMedia.map((m) => String(m.id)))
    const queueNotYetLocal = (status: 'processing' | 'failed') =>
      queue.filter(
        (q) => q.mediaId != null && q.status === status && !localIds.has(String(q.mediaId)),
      ).length
    return {
      ready: localMedia.filter((m) => m.ingestionStatus === 'ready').length,
      processing:
        localMedia.filter(
          (m) => m.ingestionStatus === 'processing' || m.ingestionStatus === 'active',
        ).length + queueNotYetLocal('processing'),
      failed:
        localMedia.filter((m) => m.ingestionStatus === 'failed').length +
        queueNotYetLocal('failed'),
    }
  }, [localMedia, queue])

  const handleClearFilters = () => {
    setStatusFilter(null)
    router.push('/dashboard/library')
  }

  // Collection context: save rule edits
  const handleCollectionSaveRules = async (filterQuery: Record<string, unknown>) => {
    if (!collectionContext) return
    const res = await fetch(`/api/smart-collections/${collectionContext.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filterQuery, isSystemGenerated: false }),
    })
    if (!res.ok) throw new Error('Update failed')
    toast.success('Rules updated')
    router.refresh()
  }

  // Collection context: pin selected assets
  const handleAddToCollection = async (pickedIds: number[]) => {
    if (!collectionContext || pickedIds.length === 0) return
    const merged = Array.from(new Set([...collectionContext.manualIncludeIds, ...pickedIds]))
    const res = await fetch(`/api/smart-collections/${collectionContext.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manualIncludes: merged }),
    })
    if (!res.ok) { toast.error('Failed to add assets'); return }
    toast.success(`${pickedIds.length} asset${pickedIds.length > 1 ? 's' : ''} added`)
    router.refresh()
  }

  // Collection context: exclude selected assets
  const handleRemoveFromCollection = async () => {
    if (!collectionContext || selectedIds.size === 0) return
    const toExclude = Array.from(selectedIds).map(Number)
    const res = await fetch(`/api/smart-collections/${collectionContext.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manualExcludes: toExclude }),
    })
    if (!res.ok) { toast.error('Failed to remove assets'); return }
    toast.success(`${toExclude.length} asset${toExclude.length > 1 ? 's' : ''} removed from collection`)
    clearSelection()
    router.refresh()
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

  // Merge queue status into localMedia so processing/failed tabs reflect live state
  useEffect(() => {
    const queueWithMedia = queue.filter((item) => item.mediaId != null)
    if (queueWithMedia.length === 0) return

    const statusMap: Record<string, Media['ingestionStatus']> = {
      uploading: 'active',
      processing: 'processing',
      ready: 'ready',
      failed: 'failed',
    }

    setLocalMedia((prev) =>
      prev.map((m) => {
        const qItem = queueWithMedia.find((q) => String(q.mediaId) === String(m.id))
        if (!qItem) return m
        const mapped = statusMap[qItem.status]
        if (!mapped || m.ingestionStatus === mapped) return m
        return { ...m, ingestionStatus: mapped }
      }),
    )
  }, [queue])

  // Inject newly registered items into localMedia so they appear in the processing tab immediately
  const seenMediaIds = useRef(new Set<string>())
  useEffect(() => {
    const newlyRegistered = queue.filter(
      (item) =>
        item.mediaId != null &&
        (item.status === 'processing' || item.status === 'failed') &&
        !seenMediaIds.current.has(String(item.mediaId)),
    )
    if (newlyRegistered.length === 0) return

    newlyRegistered.forEach((item) => seenMediaIds.current.add(String(item.mediaId)))

    // Read current localMedia via setter to avoid stale closure — no localMedia dep needed
    setLocalMedia((prev) => {
      const existingIds = new Set(prev.map((m) => String(m.id)))
      const toFetch = newlyRegistered.filter((item) => !existingIds.has(String(item.mediaId)))
      if (toFetch.length === 0) return prev

      Promise.all(
        toFetch.map((item) =>
          fetch(`/api/media/${item.mediaId}`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
        ),
      ).then((docs) => {
        const valid = docs.filter(Boolean) as Media[]
        if (valid.length === 0) return
        setLocalMedia((current) => {
          const currentIds = new Set(current.map((m) => String(m.id)))
          return [...valid.filter((d) => !currentIds.has(String(d.id))), ...current]
        })
      })

      return prev
    })
  }, [queue])

  // Fire router.refresh() exactly once on the active→idle transition
  const hadActiveUploads = useRef(false)
  useEffect(() => {
    const hasActive = queue.some((item) =>
      ['uploading', 'pending', 'processing'].includes(item.status),
    )
    if (hadActiveUploads.current && !hasActive && queue.length > 0) {
      router.refresh()
    }
    hadActiveUploads.current = hasActive
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
      {collectionContext ? (
        /* ── Collection context: header + manual includes + auto-matched label ── */
        <div className="flex flex-col gap-0 mb-6 w-full min-w-0">
          {/* Back nav */}
          <button
            onClick={() => router.push('/dashboard/library/collections')}
            className="flex items-center gap-1 text-xs text-on-surface/40 hover:text-on-surface transition-colors w-fit mb-4"
          >
            <ChevronLeft size={14} /> Collections
          </button>

          {/* Title + actions row */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-6 w-full min-w-0">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight text-primary truncate">
                {collectionContext.name}
              </h1>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="font-rubik text-[10px] uppercase tracking-widest text-on-surface/40">
                  {(
                    (collectionContext.autoMatchedCount ?? filteredMedia.length) +
                    (collectionContext.manualIncludeDocs?.length ?? 0)
                  ).toLocaleString()} ASSETS
                </span>
                {collectionContext.isSystemGenerated && (
                  <span className="font-rubik text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-sm bg-gallery-gold/10 text-gallery-gold">
                    AUTO
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {/* Date mode */}
              <div className="flex items-center gap-1 p-0.5 bg-black/[0.03] rounded-2xl">
                {(['capture', 'ingest'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setDateMode(mode)}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all',
                      dateMode === mode
                        ? 'bg-white text-gallery-gold shadow-sm'
                        : 'text-on-surface/30 hover:text-on-surface/60',
                    )}
                  >
                    {mode === 'capture' ? 'Capture' : 'Upload'}
                  </button>
                ))}
              </div>

              <Button
                variant="ghost"
                onClick={() => {
                  if (isSelectionMode) clearSelection()
                  else setIsSelectionMode(true)
                }}
                className={cn(
                  'h-9 px-3 rounded-xl gap-2 font-medium text-sm transition-all',
                  isSelectionMode
                    ? 'bg-gallery-gold/10 text-gallery-gold'
                    : 'text-on-surface/40 hover:text-primary',
                )}
              >
                <CheckSquare size={14} />
                <span className="hidden sm:inline">{isSelectionMode ? 'Cancel' : 'Select'}</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => setIsRuleEditorOpen(true)}
                className="h-9 px-3 rounded-xl gap-2 text-sm border-[#d5c4af]/30 hover:border-gallery-gold/30 hover:text-gallery-gold"
              >
                <Settings size={14} />
                <span className="hidden sm:inline">Edit Rules</span>
              </Button>

              <Button
                variant="gallery"
                onClick={() => setIsAssetPickerOpen(true)}
                className="h-9 px-4 rounded-xl gap-2 text-sm"
              >
                <Plus size={14} />
                Add Assets
              </Button>
            </div>
          </div>

          {/* Manual includes section */}
          {collectionContext.manualIncludeDocs && collectionContext.manualIncludeDocs.length > 0 && (
            <section aria-label="Manually added assets" className="mb-8 w-full min-w-0">
              <p className="text-[10px] tracking-widest font-medium text-on-surface/40 uppercase mb-3">
                MANUALLY ADDED ({collectionContext.manualIncludeDocs.length.toLocaleString()})
              </p>
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 w-full">
                {collectionContext.manualIncludeDocs.map((item) => (
                  <MediaCard
                    key={item.id}
                    media={item}
                    isSelected={selectedIds.has(item.id)}
                    onSelect={toggleSelection}
                    onView={handleView}
                    isSelectionMode={isSelectionMode || selectedIds.size > 0}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Auto-matched section label */}
          {collectionContext.hasFilterQuery && (
            <p
              className="text-[10px] tracking-widest font-medium text-on-surface/40 uppercase mb-3"
              aria-label={`Automatically matched assets: ${(collectionContext.autoMatchedCount ?? filteredMedia.length).toLocaleString()}`}
            >
              AUTOMATICALLY MATCHED ({(collectionContext.autoMatchedCount ?? filteredMedia.length).toLocaleString()})
            </p>
          )}
        </div>
      ) : variant === 'library' && (
        /* ── Library toolbar ────────────────────────────────────────────── */
        <div className="flex flex-col gap-3 mb-8">
          {/* Row 1: status filters + actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Status filter pills */}
            <div className="flex items-center gap-1.5 p-1 bg-black/[0.03] dark:bg-white/[0.03] rounded-2xl self-start">
              {(['ready', 'processing', 'failed'] as const).map((status) => {
                const count = statusCounts[status]
                return (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(statusFilter === status ? null : status)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all',
                      statusFilter === status
                        ? 'bg-white dark:bg-white/10 text-gallery-gold shadow-sm'
                        : 'text-on-surface/30 hover:text-on-surface/60',
                    )}
                  >
                    {status}
                    {count > 0 && (
                      <span
                        className={cn(
                          'inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full text-[9px] font-bold leading-none',
                          statusFilter === status
                            ? 'bg-gallery-gold/20 text-gallery-gold'
                            : status === 'failed'
                              ? 'bg-red-500/20 text-red-400'
                              : status === 'processing'
                                ? 'bg-amber-400/20 text-amber-400'
                                : 'bg-on-surface/10 text-on-surface/50',
                        )}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Right: date mode + select + ingest */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 p-1 bg-black/[0.03] dark:bg-white/[0.03] rounded-2xl">
                {(['capture', 'ingest'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setDateMode(mode)}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all',
                      dateMode === mode
                        ? 'bg-white dark:bg-white/10 text-gallery-gold shadow-sm'
                        : 'text-on-surface/30 hover:text-on-surface/60',
                    )}
                  >
                    {mode === 'capture' ? 'Capture' : 'Upload'}
                  </button>
                ))}
              </div>

              <Button
                variant="ghost"
                onClick={() => {
                  if (isSelectionMode) clearSelection()
                  else setIsSelectionMode(true)
                }}
                className={cn(
                  'h-9 px-3 rounded-xl gap-2 font-medium text-sm transition-all',
                  isSelectionMode
                    ? 'bg-gallery-gold/10 text-gallery-gold'
                    : 'text-on-surface/40 hover:text-primary',
                )}
              >
                <CheckSquare size={14} />
                <span className="hidden sm:inline">{isSelectionMode ? 'Cancel' : 'Select'}</span>
              </Button>

              {(initialFilters?.search || statusFilter) && (
                <Button
                  variant="outline"
                  onClick={() => setIsSaveViewOpen(true)}
                  className="h-9 px-3 rounded-xl border-dashed border-gallery-gold/30 text-gallery-gold hover:bg-gallery-gold/5 gap-2 text-sm"
                >
                  <Save size={14} />
                  <span className="hidden sm:inline">Save View</span>
                </Button>
              )}

              <Button
                variant="gallery"
                className="h-9 px-4 rounded-xl gap-2 text-sm shadow-sm"
                onClick={openPicker}
              >
                <Plus size={14} />
                <span className="hidden sm:inline">Ingest</span>
                <span className="sm:hidden">+</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Timeline Stream */}
      <div className="flex-1 min-h-[600px] w-full min-w-0">
        {filteredMedia.length > 0 ? (
          <TimelineStream
            groups={groups}
            dateMode={dateMode}
            selectedIds={selectedIds}
            isSelectionMode={isSelectionMode}
            onSelect={toggleSelection}
            onSelectGroup={handleSelectGroup}
            onView={handleView}
          />
        ) : localMedia.length === 0 ? (
          // No media at all — show the ingest CTA (upload prompt)
          <EmptyState />
        ) : (
          // Has media but current filter hides everything
          <EmptyState
            mode="no-results"
            statusFilter={statusFilter}
            onClearFilters={handleClearFilters}
          />
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
            <div className="bg-white/90 dark:bg-[#0a0c10]/90 backdrop-blur-2xl border border-black/[0.05] dark:border-white/[0.1] rounded-[28px] p-3 px-4 sm:px-6 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] flex items-center gap-3 sm:gap-6 w-[calc(100vw-2rem)] sm:w-auto max-w-[640px]">
              {/* Count */}
              <div className="flex flex-col min-w-0 shrink-0">
                <span className="text-[9px] font-bold tracking-widest text-gallery-gold uppercase font-rubik leading-none mb-0.5">
                  Selected
                </span>
                <span className="text-sm font-semibold text-primary whitespace-nowrap">
                  {selectedIds.size === localMedia.length ? 'All' : selectedIds.size}
                </span>
              </div>

              <div className="h-8 w-px bg-black/[0.05] dark:bg-white/[0.1] shrink-0" />

              {/* Actions */}
              <div className="flex items-center gap-1 flex-wrap">
                <Button
                  variant="ghost"
                  onClick={handleSelectAll}
                  className="h-9 rounded-xl gap-1.5 text-on-surface/60 hover:text-primary px-2 sm:px-3 text-sm"
                >
                  <CheckSquare size={14} />
                  <span className="hidden sm:inline">
                    {filteredMedia.every((m) => selectedIds.has(m.id)) ? 'Deselect All' : 'All'}
                  </span>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setIsBulkEditOpen(true)}
                  className="h-9 rounded-xl gap-1.5 text-on-surface/60 hover:text-gallery-gold px-2 sm:px-3 text-sm"
                >
                  <Edit3 size={14} />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
                {!collectionContext && (
                  <Button
                    variant="ghost"
                    onClick={() => setIsBulkCollectionOpen(true)}
                    className="h-9 rounded-xl gap-1.5 text-on-surface/60 hover:text-gallery-gold px-2 sm:px-3 text-sm"
                  >
                    <Bookmark size={14} />
                    <span className="hidden sm:inline">Collect</span>
                  </Button>
                )}
                {collectionContext ? (
                  <Button
                    variant="ghost"
                    onClick={handleRemoveFromCollection}
                    className="h-9 rounded-xl gap-1.5 text-[#bb1800] hover:bg-red-500/10 px-2 sm:px-3 text-sm"
                  >
                    <PinOff size={14} />
                    <span className="hidden sm:inline">Remove</span>
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    onClick={handleBulkDeleteTrigger}
                    className="h-9 rounded-xl gap-1.5 text-red-500 hover:bg-red-500/10 px-2 sm:px-3 text-sm"
                  >
                    <Trash2 size={14} />
                    <span className="hidden sm:inline">Delete</span>
                  </Button>
                )}
              </div>

              <div className="h-8 w-px bg-black/[0.05] dark:bg-white/[0.1] shrink-0" />

              <Button
                variant="ghost"
                size="icon"
                onClick={clearSelection}
                className="h-9 w-9 rounded-xl text-on-surface/30 hover:text-primary transition-colors shrink-0"
              >
                <CloseIcon size={16} />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Asset Viewer */}
      <AssetViewer
        media={selectedMedia}
        mediaList={filteredMedia}
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

      {/* Bulk add to collection */}
      <BulkAddToCollectionModal
        open={isBulkCollectionOpen}
        onOpenChange={setIsBulkCollectionOpen}
        mediaIds={Array.from(selectedIds) as number[]}
        onSuccess={clearSelection}
      />

      {/* Collection context modals */}
      {collectionContext && (
        <>
          <CollectionRuleEditor
            open={isRuleEditorOpen}
            onOpenChange={setIsRuleEditorOpen}
            collectionId={collectionContext.id}
            collectionName={collectionContext.name}
            onSave={handleCollectionSaveRules}
          />
          <MediaPickerModal
            open={isAssetPickerOpen}
            onOpenChange={setIsAssetPickerOpen}
            mode="include"
            alreadySelected={collectionContext.manualIncludeIds}
            onConfirm={handleAddToCollection}
          />
        </>
      )}
    </>
  )
}
