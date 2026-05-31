'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Camera,
  CheckSquare,
  Bookmark,
  Edit3,
  Filter,
  Images,
  MoreHorizontal,
  PinOff,
  Plus,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Trash2,
  X as CloseIcon,
} from 'lucide-react'
import { revalidateCollections } from '@/app/(dashboard)/actions/revalidate'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import Link from 'next/link'

import { cn } from '@/utilities/cn'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Media } from '@/payload-types'
import { AssetViewer } from '@/components/AssetViewer'
import { MasonryGrid } from '@/components/Gallery/MasonryGrid'
import { TimelineStream } from '@/components/Gallery/TimelineStream'
import { BulkEditTagsModal } from '@/components/Gallery/BulkEditTagsModal'
import { SafetyLockDeleteModal } from '@/components/Gallery/SafetyLockDeleteModal'
import { CollectionRuleEditor } from '@/components/SmartCollections/CollectionRuleEditor'
import { MediaPickerModal } from '@/components/SmartCollections/MediaPickerModal'
import { BulkAddToCollectionModal } from '@/components/SmartCollections/BulkAddToCollectionModal'
import { FilterBar, type ViewMode } from './FilterBar'
import { CompactGrid } from './CompactGrid'
import { groupMedia, type DateMode } from '@/lib/groupMedia'
import {
  fetchCollectionMediaPage,
  type ChipData,
  type CollectionFilters,
} from '@/app/(dashboard)/actions/collections'

const VIEW_MODE_KEY = 'fh_collection_view_mode'
const PAGE_SIZE = 48

const ICON_MAP: Record<string, React.ElementType> = {
  camera: Camera,
  tag: Tag,
  sparkles: Sparkles,
  folder: Images,
  map: Images,
}

export interface CollectionExpandedViewProps {
  collectionId: number
  collectionName: string
  collectionIcon?: string
  isSystemGenerated?: boolean
  description?: string
  updatedAt?: string
  filterQuery: Record<string, unknown>
  manualIncludeIds: number[]
  manualIncludeDocs: Media[]
  manualExcludeIds: number[]
  hasFilterQuery: boolean
  initialMedia: Media[]
  initialTotalCount: number
  chipData: ChipData
}

export function CollectionExpandedView({
  collectionId,
  collectionName,
  collectionIcon,
  isSystemGenerated,
  description,
  filterQuery,
  manualIncludeIds,
  manualIncludeDocs: initialManualIncludeDocs,
  manualExcludeIds,
  hasFilterQuery,
  initialMedia,
  initialTotalCount,
  chipData,
}: CollectionExpandedViewProps) {
  const router = useRouter()

  // ── Viewport detection ────────────────────────────────────────────────────
  // lg (1024px): MobileNav visible; sm (640px): header collapses to compact layout
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  // Below sm: header actions collapse and More opens a bottom drawer instead of dropdown
  const isCompact = useMediaQuery('(max-width: 639px)')

  // ── View mode (persisted to localStorage) ───────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>('masonry')
  useEffect(() => {
    const saved = localStorage.getItem(VIEW_MODE_KEY) as ViewMode | null
    if (saved && ['masonry', 'grid', 'timeline'].includes(saved)) setViewMode(saved)
  }, [])
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode)
    localStorage.setItem(VIEW_MODE_KEY, mode)
  }

  // ── Filter chips ──────────────────────────────────────────────────────────
  const [activeFilters, setActiveFilters] = useState<CollectionFilters>({})

  // ── Local media state — syncs from server on router.refresh() ────────────
  const [autoMedia, setAutoMedia] = useState<Media[]>(initialMedia)
  const [totalAutoCount, setTotalAutoCount] = useState(initialTotalCount)
  const [manualDocs, setManualDocs] = useState<Media[]>(initialManualIncludeDocs)
  const [page, setPage] = useState(1)
  const [hasNextPage, setHasNextPage] = useState(initialTotalCount > PAGE_SIZE)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Sync server-refreshed props back into state (triggered by router.refresh())
  useEffect(() => {
    setAutoMedia(initialMedia)
    setTotalAutoCount(initialTotalCount)
    setHasNextPage(initialTotalCount > PAGE_SIZE)
    setPage(1)
  }, [initialMedia, initialTotalCount])

  useEffect(() => {
    setManualDocs(initialManualIncludeDocs)
  }, [initialManualIncludeDocs])

  // Re-fetch from page 1 when filters change
  const filtersKey = JSON.stringify(activeFilters)
  const prevFiltersKey = useRef(filtersKey)
  useEffect(() => {
    if (prevFiltersKey.current === filtersKey) return
    prevFiltersKey.current = filtersKey
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    setIsLoadingMore(true)
    fetchCollectionMediaPage(collectionId, 1, filterQuery, manualExcludeIds, activeFilters)
      .then(({ docs, hasNextPage: hnp, totalDocs }) => {
        setAutoMedia(docs)
        setTotalAutoCount(totalDocs)
        setHasNextPage(hnp)
        setPage(1)
      })
      .catch(() => toast.error('Failed to load assets'))
      .finally(() => setIsLoadingMore(false))
  }, [filtersKey, collectionId, filterQuery, manualExcludeIds, activeFilters])

  // Infinite scroll observer
  useEffect(() => {
    const el = loadMoreRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isLoadingMore) {
          const nextPage = page + 1
          setIsLoadingMore(true)
          setPage(nextPage)
          fetchCollectionMediaPage(collectionId, nextPage, filterQuery, manualExcludeIds, activeFilters)
            .then(({ docs, hasNextPage: hnp }) => {
              setAutoMedia((prev) => {
                const seen = new Set(prev.map((m) => m.id))
                return [...prev, ...docs.filter((d) => !seen.has(d.id))]
              })
              setHasNextPage(hnp)
            })
            .catch(() => toast.error('Failed to load more assets'))
            .finally(() => setIsLoadingMore(false))
        }
      },
      { rootMargin: '200px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, isLoadingMore, page, collectionId, filterQuery, manualExcludeIds, activeFilters])

  // ── Selection state ───────────────────────────────────────────────────────
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set())

  const toggleSelection = useCallback((id: string | number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else { next.add(id); setIsSelectionMode(true) }
      return next
    })
  }, [])

  const handleSelectGroup = useCallback((ids: (string | number)[], allSelected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allSelected) ids.forEach((id) => next.delete(id))
      else { ids.forEach((id) => next.add(id)); setIsSelectionMode(true) }
      return next
    })
  }, [])

  const allMedia = useMemo(() => [...manualDocs, ...autoMedia], [manualDocs, autoMedia])

  const handleSelectAll = useCallback(() => {
    const ids = allMedia.map((m) => m.id)
    const allSelected = ids.every((id) => selectedIds.has(id))
    setSelectedIds(new Set(allSelected ? [] : ids))
    if (!allSelected) setIsSelectionMode(true)
  }, [allMedia, selectedIds])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
    setIsSelectionMode(false)
  }, [])

  // ── Asset viewer ─────────────────────────────────────────────────────────
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null)
  const handleView = useCallback((media: Media) => setSelectedMedia(media), [])

  // ── Date grouping ──────────────────────────────────────────────────────────
  const [dateMode, setDateMode] = useState<DateMode>('capture')
  const groups = useMemo(() => groupMedia(autoMedia, dateMode), [autoMedia, dateMode])

  // ── Modal states ──────────────────────────────────────────────────────────
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false)
  const [isSafetyLockOpen, setIsSafetyLockOpen] = useState(false)
  const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isRuleEditorOpen, setIsRuleEditorOpen] = useState(false)
  const [isAssetPickerOpen, setIsAssetPickerOpen] = useState(false)
  const [isBulkCollectionOpen, setIsBulkCollectionOpen] = useState(false)
  const [isMoreOpen, setIsMoreOpen] = useState(false)
  const [isHeaderMoreOpen, setIsHeaderMoreOpen] = useState(false)

  // ── Collection mutations (optimistic-first) ───────────────────────────────

  const handleSaveRules = async (fq: Record<string, unknown>) => {
    const res = await fetch(`/api/smart-collections/${collectionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filterQuery: fq, isSystemGenerated: false }),
    })
    if (!res.ok) throw new Error('Update failed')
    toast.success('Rules updated')
    await revalidateCollections()
    router.refresh()
  }

  const handleAddToCollection = async (pickedIds: number[]) => {
    if (!pickedIds.length) return
    const merged = Array.from(new Set([...manualIncludeIds, ...pickedIds]))
    const res = await fetch(`/api/smart-collections/${collectionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manualIncludes: merged }),
    })
    if (!res.ok) { toast.error('Failed to add assets'); return }
    toast.success(`${pickedIds.length} asset${pickedIds.length > 1 ? 's' : ''} added`)
    await revalidateCollections()
    router.refresh()
  }

  // Optimistic: remove items immediately, rollback if API fails
  const handleRemoveFromCollection = async () => {
    if (!selectedIds.size) return
    const toExclude = Array.from(selectedIds).map(Number)
    const excludeSet = new Set(toExclude)

    // Snapshot for rollback
    const prevAuto = autoMedia
    const prevManual = manualDocs

    // Optimistic update — remove from both lists immediately
    setAutoMedia((prev) => prev.filter((m) => !excludeSet.has(m.id as number)))
    setManualDocs((prev) => prev.filter((m) => !excludeSet.has(m.id as number)))
    setTotalAutoCount((prev) => Math.max(0, prev - toExclude.filter((id) => autoMedia.some((m) => m.id === id)).length))
    clearSelection()

    const res = await fetch(`/api/smart-collections/${collectionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manualExcludes: toExclude }),
    })

    if (!res.ok) {
      // Rollback
      setAutoMedia(prevAuto)
      setManualDocs(prevManual)
      toast.error('Failed to remove assets')
      return
    }

    toast.success(`${toExclude.length} asset${toExclude.length > 1 ? 's' : ''} removed`)
    await revalidateCollections()
    router.refresh()
  }

  // Optimistic: delete items from view immediately, rollback if API fails
  const handleConfirmBulkDelete = async () => {
    setIsDeleting(true)
    const toDelete = new Set(Array.from(selectedIds).map(String))

    const prevAuto = autoMedia
    const prevManual = manualDocs

    // Optimistic removal
    setAutoMedia((prev) => prev.filter((m) => !toDelete.has(String(m.id))))
    setManualDocs((prev) => prev.filter((m) => !toDelete.has(String(m.id))))
    clearSelection()
    setIsSafetyLockOpen(false)

    try {
      const { bulkDeleteMediaAction } = await import('@/app/(dashboard)/actions/media')
      const result = await bulkDeleteMediaAction(Array.from(selectedIds))
      if (result.success) {
        toast.success(result.message)
        await revalidateCollections()
        router.refresh()
      } else {
        setAutoMedia(prevAuto)
        setManualDocs(prevManual)
        toast.error(result.message || 'Failed to delete assets')
      }
    } catch {
      setAutoMedia(prevAuto)
      setManualDocs(prevManual)
      toast.error('An unexpected error occurred')
    } finally {
      setIsDeleting(false)
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const CollectionIcon = ICON_MAP[collectionIcon ?? ''] ?? Images
  const typeIcon = !hasFilterQuery ? (
    <Bookmark size={12} className="text-on-surface/40" />
  ) : isSystemGenerated ? (
    <Sparkles size={12} className="text-gallery-gold" />
  ) : (
    <Filter size={12} className="text-gallery-gold" />
  )

  const hasActiveFilters =
    (activeFilters.types?.length ?? 0) > 0 || !!activeFilters.camera || !!activeFilters.tag
  const totalCount = hasActiveFilters ? totalAutoCount : totalAutoCount + manualDocs.length
  const noResults = autoMedia.length === 0 && manualDocs.length === 0 && !isLoadingMore

  return (
    <div className="flex flex-col min-h-[calc(100vh-180px)]">

      {/* ── Collection header ────────────────────────────────────────────── */}
      <div className="mb-6 space-y-2.5">

        {/* Row 1 — Breadcrumb (always full-width, never collides) */}
        <Link
          href="/dashboard/library/collections"
          className="inline-flex items-center gap-1.5 font-rubik text-[10px] font-bold text-[#445aa5]/60 hover:text-[#445aa5] uppercase tracking-[0.18em] transition-colors"
          aria-label="Back to Collections"
        >
          <ArrowLeft className="h-3 w-3" />
          Collections
        </Link>

        {/* Row 2 — Identity + Actions (single flex row, actions never wrap) */}
        <div className="flex items-center gap-3 min-w-0">

          {/* Identity — grows, truncates, never pushes actions off-screen */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-[12px] bg-gallery-gold/10 flex items-center justify-center text-gallery-gold shrink-0">
              <CollectionIcon size={15} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold tracking-tight text-primary truncate">
                  {collectionName}
                </h1>
                {isSystemGenerated && (
                  <span className="font-rubik text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-[6px] bg-gallery-gold/10 text-gallery-gold shrink-0">
                    AUTO
                  </span>
                )}
                <span className="hidden sm:flex items-center gap-1 text-on-surface/30 shrink-0">
                  {typeIcon}
                </span>
              </div>
              {description && (
                <p className="text-[11px] text-on-surface/40 truncate font-varela max-w-xs hidden sm:block">
                  {description}
                </p>
              )}
            </div>
          </div>

          {/* Actions — shrink-0 ensures this block never breaks into a new line */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">

            {/* Asset count */}
            <div className="text-center px-1">
              <p className="font-rubik text-lg font-bold text-gallery-gold tabular-nums leading-none">
                {totalCount.toLocaleString()}
              </p>
              <p className="font-rubik text-[8px] text-on-surface/30 uppercase tracking-wider">
                assets
              </p>
            </div>

            <div className="w-px h-7 bg-black/[0.06] dark:bg-white/[0.06] shrink-0" />

            {/* Sort by toggle — desktop only; accessible in mobile drawer */}
            <div className="hidden sm:flex items-center gap-1.5">
              <span className="font-rubik text-[9px] text-on-surface/30 uppercase tracking-widest select-none">
                Sort
              </span>
              <div className="flex items-center gap-0.5 p-0.5 bg-black/[0.04] dark:bg-white/[0.04] rounded-[14px]">
                {(['capture', 'ingest'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setDateMode(mode)}
                    aria-pressed={dateMode === mode}
                    className={cn(
                      'px-2.5 py-1 rounded-[12px] text-[9px] font-bold uppercase tracking-widest transition-all font-rubik',
                      dateMode === mode
                        ? 'bg-white dark:bg-white/10 text-gallery-gold shadow-sm'
                        : 'text-on-surface/30 hover:text-on-surface/60',
                    )}
                  >
                    {mode === 'capture' ? 'Shot Date' : 'Added'}
                  </button>
                ))}
              </div>
            </div>

            {/* Select */}
            <Button
              variant="ghost"
              onClick={() => (isSelectionMode ? clearSelection() : setIsSelectionMode(true))}
              aria-label={isSelectionMode ? 'Cancel selection' : 'Select assets'}
              className={cn(
                'h-8 rounded-[12px] gap-1.5 text-xs transition-all',
                isCompact ? 'w-8 px-0 justify-center' : 'px-2.5',
                isSelectionMode
                  ? 'bg-gallery-gold/10 text-gallery-gold'
                  : 'text-on-surface/40 hover:text-primary',
              )}
            >
              <CheckSquare size={13} />
              <span className="hidden sm:inline">{isSelectionMode ? 'Cancel' : 'Select'}</span>
            </Button>

            {/* Add */}
            <Button
              variant="gallery"
              onClick={() => setIsAssetPickerOpen(true)}
              aria-label="Add assets to collection"
              className={cn(
                'h-8 rounded-[12px] gap-1.5 text-xs shadow-sm',
                isCompact ? 'w-8 px-0 justify-center' : 'px-3',
              )}
            >
              <Plus size={13} />
              <span className="hidden sm:inline">Add</span>
            </Button>

            {/* More — bottom sheet on mobile, dropdown on desktop */}
            {isCompact ? (
              <>
                <button
                  aria-label="More options"
                  onClick={() => setIsHeaderMoreOpen(true)}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/[0.06] dark:hover:bg-white/[0.08] text-on-surface/40 hover:text-on-surface transition-colors"
                >
                  <MoreHorizontal size={15} />
                </button>

                {/* Mobile bottom drawer */}
                <Sheet open={isHeaderMoreOpen} onOpenChange={setIsHeaderMoreOpen}>
                  <SheetContent
                    side="bottom"
                    className="rounded-t-[24px] px-0 pb-safe"
                  >
                    {/* Drag handle */}
                    <div className="mx-auto w-10 h-1 rounded-full bg-black/[0.1] dark:bg-white/[0.15] mb-2 mt-1" aria-hidden="true" />

                    <SheetHeader className="px-5 pb-3">
                      <SheetTitle className="text-sm font-semibold text-left">Collection Options</SheetTitle>
                    </SheetHeader>

                    {/* Sort by — exposed here on mobile */}
                    <div className="px-5 py-3 border-t border-black/[0.05] dark:border-white/[0.06]">
                      <p className="font-rubik text-[9px] uppercase tracking-widest text-on-surface/40 mb-2">
                        Sort by
                      </p>
                      <div className="flex gap-2">
                        {(['capture', 'ingest'] as const).map((mode) => (
                          <button
                            key={mode}
                            onClick={() => setDateMode(mode)}
                            aria-pressed={dateMode === mode}
                            className={cn(
                              'flex-1 py-2.5 rounded-[14px] text-[11px] font-bold uppercase tracking-widest transition-all font-rubik border',
                              dateMode === mode
                                ? 'bg-gallery-gold/10 text-gallery-gold border-gallery-gold/20'
                                : 'text-on-surface/40 border-black/[0.06] dark:border-white/[0.08] hover:text-on-surface/70',
                            )}
                          >
                            {mode === 'capture' ? 'Shot Date' : 'Added Date'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="px-3 py-2 border-t border-black/[0.05] dark:border-white/[0.06]">
                      <SheetClose asChild>
                        <button
                          onClick={() => setIsRuleEditorOpen(true)}
                          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-[16px] text-sm text-left hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors"
                        >
                          <Settings size={16} className="text-on-surface/40 shrink-0" />
                          <span className="font-medium">Edit Rules</span>
                        </button>
                      </SheetClose>
                      <SheetClose asChild>
                        <button
                          onClick={() => setIsAssetPickerOpen(true)}
                          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-[16px] text-sm text-left hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors"
                        >
                          <SlidersHorizontal size={16} className="text-on-surface/40 shrink-0" />
                          <span className="font-medium">Include / Exclude</span>
                        </button>
                      </SheetClose>
                    </div>

                    <div className="px-3 py-2 border-t border-black/[0.05] dark:border-white/[0.06]">
                      <SheetClose asChild>
                        <Link
                          href="/dashboard/library/collections"
                          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-[16px] text-sm hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors"
                        >
                          <ArrowLeft size={16} className="text-on-surface/40 shrink-0" />
                          <span className="font-medium">All Collections</span>
                        </Link>
                      </SheetClose>
                    </div>
                  </SheetContent>
                </Sheet>
              </>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label="More options"
                    className="rounded-full p-1.5 hover:bg-black/[0.06] dark:hover:bg-white/[0.08] text-on-surface/40 hover:text-on-surface transition-colors"
                  >
                    <MoreHorizontal size={15} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-[16px] min-w-[172px]">
                  <DropdownMenuItem onClick={() => setIsRuleEditorOpen(true)} className="gap-2 cursor-pointer">
                    <Settings size={13} /> Edit Rules
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsAssetPickerOpen(true)} className="gap-2 cursor-pointer">
                    <SlidersHorizontal size={13} /> Include / Exclude
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="gap-2 cursor-pointer">
                    <Link href="/dashboard/library/collections">
                      <ArrowLeft size={13} /> All Collections
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      {/* ── Page content ─────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1">

        {/* Filter bar */}
        <FilterBar
          chips={chipData}
          activeFilters={activeFilters}
          viewMode={viewMode}
          onFiltersChange={setActiveFilters}
          onViewModeChange={handleViewModeChange}
        />

        {/* Manual includes */}
        {manualDocs.length > 0 && !hasActiveFilters && (
          <section aria-label="Manually added assets" className="mb-8">
            <p className="font-rubik text-[10px] tracking-widest text-on-surface/40 uppercase mb-3">
              Manually Added ({manualDocs.length.toLocaleString()})
            </p>
            {viewMode === 'grid' ? (
              <CompactGrid
                items={manualDocs}
                selectedIds={selectedIds}
                isSelectionMode={isSelectionMode}
                onSelect={toggleSelection}
                onView={handleView}
              />
            ) : (
              <MasonryGrid
                items={manualDocs}
                selectedIds={selectedIds}
                isSelectionMode={isSelectionMode}
                onSelect={toggleSelection}
                onView={handleView}
              />
            )}
          </section>
        )}

        {/* Auto-matched label */}
        {hasFilterQuery && !hasActiveFilters && autoMedia.length > 0 && (
          <p className="font-rubik text-[10px] tracking-widest text-on-surface/40 uppercase mb-3">
            Auto-matched ({totalAutoCount.toLocaleString()})
          </p>
        )}

        {/* Main grid */}
        <div className="flex-1 min-h-[400px]">
          {noResults ? (
            <CollectionEmptyState
              hasActiveFilters={hasActiveFilters}
              hasFilterQuery={hasFilterQuery}
              collectionName={collectionName}
              onClearFilters={() => setActiveFilters({})}
              onEditRules={() => setIsRuleEditorOpen(true)}
              onAddAssets={() => setIsAssetPickerOpen(true)}
            />
          ) : viewMode === 'timeline' ? (
            <TimelineStream
              groups={groups}
              dateMode={dateMode}
              selectedIds={selectedIds}
              isSelectionMode={isSelectionMode}
              onSelect={toggleSelection}
              onSelectGroup={handleSelectGroup}
              onView={handleView}
            />
          ) : viewMode === 'grid' ? (
            <CompactGrid
              items={autoMedia}
              selectedIds={selectedIds}
              isSelectionMode={isSelectionMode}
              onSelect={toggleSelection}
              onView={handleView}
            />
          ) : (
            <MasonryGrid
              items={autoMedia}
              selectedIds={selectedIds}
              isSelectionMode={isSelectionMode}
              onSelect={toggleSelection}
              onView={handleView}
            />
          )}

          {/* Infinite scroll sentinel */}
          <div ref={loadMoreRef} className="h-16 flex items-center justify-center">
            {isLoadingMore && (
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-gallery-gold/40 animate-bounce"
                    style={{ animationDelay: `${i * 120}ms` }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Selection toolbar ────────────────────────────────────────────── */}
      {/*
        z-[50]: above MobileNav (z-40). Sheet portals (also z-50) render later in DOM and win.
        bottom-32 on mobile: MobileNav pill is ~72px tall at bottom-6 (24px), so top edge ≈ 96px.
        bottom-32 (128px) gives a comfortable 32px gap. lg:bottom-6 once MobileNav is hidden.
      */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 32 }}
            className="fixed bottom-32 lg:bottom-6 left-1/2 -translate-x-1/2 z-[50]"
          >
            {/* No backdrop-filter here — it would create a stacking context trapping Sheet portals. */}
            <div
              role="toolbar"
              aria-label="Asset selection actions"
              className="bg-white dark:bg-[#111] border border-black/[0.07] dark:border-white/[0.1] rounded-[20px] px-3 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.22)] flex items-center gap-1"
            >
              {/* Count */}
              <div className="flex items-baseline gap-1 shrink-0 pl-1 pr-1.5">
                <span className="font-rubik text-[13px] font-bold text-gallery-gold tabular-nums leading-none">
                  {selectedIds.size}
                </span>
                <span className="font-rubik text-[8px] uppercase tracking-widest text-on-surface/35 leading-none">
                  {selectedIds.size === 1 ? 'asset' : 'assets'}
                </span>
              </div>

              <div className="h-5 w-px bg-black/[0.09] dark:bg-white/[0.1] shrink-0 mx-0.5" />

              {/* Select all */}
              <ToolbarBtn
                onClick={handleSelectAll}
                label={allMedia.every((m) => selectedIds.has(m.id)) ? 'Deselect all' : 'Select all'}
                icon={<CheckSquare size={15} />}
              />

              {/* Remove — primary, always labelled */}
              <button
                onClick={() => setIsRemoveConfirmOpen(true)}
                aria-label="Remove from collection"
                className="flex items-center gap-1 h-8 px-2.5 rounded-[12px] text-[#bb1800] hover:bg-[#bb1800]/[0.08] transition-colors font-rubik text-[10px] font-bold uppercase tracking-wide shrink-0"
              >
                <PinOff size={13} />
                <span>Remove</span>
              </button>

              {/* Delete */}
              <ToolbarBtn
                onClick={() => setIsSafetyLockOpen(true)}
                label="Delete selected assets"
                icon={<Trash2 size={14} />}
                danger
              />

              {/* More — Sheet on mobile (< lg), DropdownMenu on desktop */}
              {isMobile ? (
                <ToolbarBtn
                  onClick={() => setIsMoreOpen(true)}
                  label="More actions"
                  icon={<MoreHorizontal size={15} />}
                />
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      aria-label="More actions"
                      className="h-8 w-8 rounded-[12px] flex items-center justify-center text-on-surface/50 hover:text-primary hover:bg-black/[0.05] dark:hover:bg-white/[0.07] transition-colors shrink-0"
                    >
                      <MoreHorizontal size={15} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    side="top"
                    sideOffset={8}
                    className="rounded-[16px] min-w-[176px] z-[60]"
                  >
                    <DropdownMenuItem
                      onClick={handleSelectAll}
                      className="gap-2 cursor-pointer"
                    >
                      <CheckSquare size={13} />
                      {allMedia.every((m) => selectedIds.has(m.id)) ? 'Deselect All' : 'Select All'}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setIsBulkEditOpen(true)}
                      className="gap-2 cursor-pointer"
                    >
                      <Edit3 size={13} /> Edit Tags
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setIsBulkCollectionOpen(true)}
                      className="gap-2 cursor-pointer"
                    >
                      <Bookmark size={13} /> Add to Collection
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <div className="h-5 w-px bg-black/[0.09] dark:bg-white/[0.1] shrink-0 mx-0.5" />

              {/* Close */}
              <ToolbarBtn
                onClick={clearSelection}
                label="Cancel selection"
                icon={<CloseIcon size={15} />}
                muted
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── More-actions bottom sheet (mobile only, sibling to toolbar) ───── */}
      {isMobile && (
        <Sheet open={isMoreOpen} onOpenChange={setIsMoreOpen}>
          <SheetContent
            side="bottom"
            className="rounded-t-[24px] px-0 border-0 shadow-[0_-8px_40px_rgba(0,0,0,0.18)]"
          >
            <SheetHeader className="px-6 pb-3 border-b border-black/[0.04] dark:border-white/[0.04]">
              <SheetTitle className="font-rubik text-[11px] uppercase tracking-widest text-on-surface/50 font-bold text-left">
                {selectedIds.size} {selectedIds.size === 1 ? 'asset' : 'assets'} selected
              </SheetTitle>
            </SheetHeader>

            <div className="flex flex-col py-2">
              <SheetActionRow
                icon={<CheckSquare size={18} />}
                label={allMedia.every((m) => selectedIds.has(m.id)) ? 'Deselect All' : 'Select All'}
                onClick={() => { handleSelectAll(); setIsMoreOpen(false) }}
              />
              <SheetActionRow
                icon={<Edit3 size={18} />}
                label="Edit Tags"
                onClick={() => { setIsBulkEditOpen(true); setIsMoreOpen(false) }}
              />
              <SheetActionRow
                icon={<Bookmark size={18} />}
                label="Add to Another Collection"
                onClick={() => { setIsBulkCollectionOpen(true); setIsMoreOpen(false) }}
              />
              <div className="h-px bg-black/[0.04] dark:bg-white/[0.05] mx-6 my-2" />
              <SheetActionRow
                icon={<PinOff size={18} />}
                label="Remove from Collection"
                onClick={() => { setIsRemoveConfirmOpen(true); setIsMoreOpen(false) }}
                destructive
              />
              <SheetActionRow
                icon={<Trash2 size={18} />}
                label="Delete Assets"
                onClick={() => { setIsSafetyLockOpen(true); setIsMoreOpen(false) }}
                destructive
              />
            </div>
            {/* Safe-area spacing for iPhone home indicator */}
            <div className="h-safe-area-inset-bottom pb-4" />
          </SheetContent>
        </Sheet>
      )}

      {/* ── Viewers & modals ─────────────────────────────────────────────── */}
      <AssetViewer
        media={selectedMedia}
        mediaList={allMedia}
        onClose={() => setSelectedMedia(null)}
      />

      <BulkEditTagsModal
        isOpen={isBulkEditOpen}
        onClose={() => setIsBulkEditOpen(false)}
        selectedIds={Array.from(selectedIds)}
        onSuccess={async () => { clearSelection(); await revalidateCollections(); router.refresh() }}
      />

      <SafetyLockDeleteModal
        isOpen={isSafetyLockOpen}
        onClose={() => setIsSafetyLockOpen(false)}
        count={selectedIds.size}
        onConfirm={handleConfirmBulkDelete}
        isDeleting={isDeleting}
      />

      {/* Remove-from-collection confirmation — lighter than SafetyLock since it's reversible */}
      <Dialog open={isRemoveConfirmOpen} onOpenChange={setIsRemoveConfirmOpen}>
        <DialogContent className="max-w-[380px] rounded-[24px] p-0 overflow-hidden border-none bg-white dark:bg-[#0a0c10]">
          <div className="p-7 flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 rounded-[16px] bg-[#bb1800]/10 flex items-center justify-center text-[#bb1800]">
              <PinOff size={22} />
            </div>
            <DialogHeader className="p-0 space-y-1.5">
              <DialogTitle className="text-lg font-semibold tracking-tight text-primary">
                Remove from collection?
              </DialogTitle>
              <DialogDescription className="text-sm text-on-surface/50 font-varela">
                {selectedIds.size === 1
                  ? 'This asset will be excluded from the collection. The asset itself is not deleted.'
                  : `${selectedIds.size} assets will be excluded from the collection. The assets themselves are not deleted.`}
              </DialogDescription>
            </DialogHeader>
          </div>
          <DialogFooter className="px-7 pb-7 flex-col gap-2">
            <Button
              onClick={() => { handleRemoveFromCollection(); setIsRemoveConfirmOpen(false) }}
              className="w-full h-11 rounded-[14px] bg-[#bb1800] hover:bg-[#9a1400] text-white font-rubik text-[11px] font-bold uppercase tracking-widest"
            >
              <PinOff size={14} className="mr-2" />
              Remove {selectedIds.size === 1 ? 'Asset' : `${selectedIds.size} Assets`}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setIsRemoveConfirmOpen(false)}
              className="w-full h-11 rounded-[14px] text-on-surface/50 hover:text-primary font-rubik text-[11px] font-bold uppercase tracking-widest"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BulkAddToCollectionModal
        open={isBulkCollectionOpen}
        onOpenChange={setIsBulkCollectionOpen}
        mediaIds={Array.from(selectedIds) as number[]}
        onSuccess={async () => { clearSelection(); await revalidateCollections(); router.refresh() }}
      />

      <CollectionRuleEditor
        open={isRuleEditorOpen}
        onOpenChange={setIsRuleEditorOpen}
        collectionId={collectionId}
        collectionName={collectionName}
        onSave={handleSaveRules}
      />

      <MediaPickerModal
        open={isAssetPickerOpen}
        onOpenChange={setIsAssetPickerOpen}
        mode="include"
        alreadySelected={manualIncludeIds}
        onConfirm={handleAddToCollection}
      />
    </div>
  )
}

// ── Toolbar helpers ───────────────────────────────────────────────────────────

function ToolbarBtn({
  onClick,
  label,
  icon,
  danger,
  muted,
  className,
}: {
  onClick: () => void
  label: string
  icon: React.ReactNode
  danger?: boolean
  muted?: boolean
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        'h-8 w-8 rounded-[12px] flex items-center justify-center transition-colors shrink-0',
        danger
          ? 'text-red-400 hover:text-red-500 hover:bg-red-500/[0.08]'
          : muted
            ? 'text-on-surface/30 hover:text-primary hover:bg-black/[0.05] dark:hover:bg-white/[0.07]'
            : 'text-on-surface/50 hover:text-primary hover:bg-black/[0.05] dark:hover:bg-white/[0.07]',
        className,
      )}
    >
      {icon}
    </button>
  )
}

function SheetActionRow({
  icon,
  label,
  onClick,
  destructive,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  destructive?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-4 w-full px-6 py-3.5 text-left transition-colors active:bg-black/[0.04] dark:active:bg-white/[0.05]',
        destructive ? 'text-[#bb1800]' : 'text-on-surface hover:bg-black/[0.03] dark:hover:bg-white/[0.04]',
      )}
    >
      <span className="opacity-70">{icon}</span>
      <span className="text-sm font-medium">{label}</span>
    </button>
  )
}

// ── Empty states ──────────────────────────────────────────────────────────────

function CollectionEmptyState({
  hasActiveFilters,
  hasFilterQuery,
  collectionName,
  onClearFilters,
  onEditRules,
  onAddAssets,
}: {
  hasActiveFilters: boolean
  hasFilterQuery: boolean
  collectionName: string
  onClearFilters: () => void
  onEditRules: () => void
  onAddAssets: () => void
}) {
  if (hasActiveFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-[20px] bg-gallery-gold/5 flex items-center justify-center text-gallery-gold/40 mb-6">
          <Filter size={28} strokeWidth={1} />
        </div>
        <h3 className="text-lg font-semibold text-primary mb-2">No assets match these filters</h3>
        <p className="text-sm text-on-surface/40 max-w-xs mb-8 font-varela">
          Try removing a chip to broaden your view.
        </p>
        <Button
          variant="outline"
          onClick={onClearFilters}
          className="h-10 px-6 rounded-[16px] font-rubik text-[10px] uppercase tracking-widest hover:text-gallery-gold hover:border-gallery-gold/30"
        >
          Clear Filters
        </Button>
      </div>
    )
  }

  if (!hasFilterQuery) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-[20px] bg-gallery-gold/5 flex items-center justify-center text-gallery-gold/40 mb-6">
          <Plus size={28} strokeWidth={1} />
        </div>
        <h3 className="text-lg font-semibold text-primary mb-2">Add assets to get started</h3>
        <p className="text-sm text-on-surface/40 max-w-xs mb-8 font-varela">
          Pick assets from your archive to include in <strong>{collectionName}</strong>.
        </p>
        <Button
          variant="gallery"
          onClick={onAddAssets}
          className="h-10 px-6 rounded-[16px] gap-2 text-sm"
        >
          <Plus size={14} /> Pick Assets
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-[20px] bg-gallery-gold/5 flex items-center justify-center text-gallery-gold/40 mb-6">
        <Sparkles size={28} strokeWidth={1} />
      </div>
      <h3 className="text-lg font-semibold text-primary mb-2">Nothing here yet</h3>
      <p className="text-sm text-on-surface/40 max-w-xs mb-8 font-varela">
        This collection&apos;s rules haven&apos;t matched any assets in your archive.
      </p>
      <Button
        variant="outline"
        onClick={onEditRules}
        className="h-10 px-6 rounded-[16px] gap-2 font-rubik text-[10px] uppercase tracking-widest hover:text-gallery-gold hover:border-gallery-gold/30"
      >
        <Settings size={13} /> Edit Rules
      </Button>
    </div>
  )
}
