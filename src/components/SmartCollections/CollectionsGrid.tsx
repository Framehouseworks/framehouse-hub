'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Layers,
  Sparkles,
  Eye,
  EyeOff,
  RefreshCw,
  CheckSquare,
  X,
  Trash2,
  EyeOff as HideIcon,
  Search,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/utilities/cn'
import { CollectionCard, type CollectionCardData } from './CollectionCard'
import { NewCollectionCard } from './NewCollectionCard'
import { CollectionGroupSection } from './CollectionGroupSection'
import { CollectionRuleEditor } from './CollectionRuleEditor'
import { ManualOverridesPanel } from './ManualOverridesPanel'
import { toast } from 'sonner'

interface CollectionsGridProps {
  collections: CollectionCardData[]
  hiddenCollections?: CollectionCardData[]
  hasNewAutoCollections?: boolean
}

// ─── Group definitions ───────────────────────────────────────────────────────

const GROUP_DEFS: { key: string; label: string; defaultExpanded: boolean }[] = [
  { key: 'media_type', label: 'MEDIA TYPE', defaultExpanded: true },
  { key: 'tags', label: 'BY TAG', defaultExpanded: true },
  { key: 'metadata', label: 'BY METADATA', defaultExpanded: true },
  { key: 'location', label: 'BY LOCATION', defaultExpanded: false },
  { key: 'manual', label: 'MANUAL', defaultExpanded: true },
]

const RECENT_KEY = 'fh_recent_collections'

// ─── Recent strip (localStorage-backed) ──────────────────────────────────────

function RecentStrip({
  allCollections,
  cardProps,
}: {
  allCollections: CollectionCardData[]
  cardProps: Omit<React.ComponentProps<typeof CollectionCard>, 'collection'>
}) {
  const [recentIds, setRecentIds] = useState<number[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY)
      if (raw) setRecentIds(JSON.parse(raw) as number[])
    } catch {
      // ignore
    }
  }, [])

  const recent = useMemo(
    () =>
      recentIds
        .map((id) => allCollections.find((c) => c.id === id))
        .filter(Boolean) as CollectionCardData[],
    [recentIds, allCollections],
  )

  if (recent.length < 2) return null

  return (
    <section aria-label="Recently viewed collections" className="flex flex-col gap-0 mb-1">
      <p className="text-[10px] tracking-widest font-medium text-[#1a1c1c]/40 uppercase py-2.5 select-none">
        RECENT
      </p>
      <div
        className={cn(
          'flex gap-4 overflow-x-auto pb-4',
          'snap-x snap-mandatory scroll-smooth',
          // Hide scrollbar cross-browser
          '[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]',
        )}
        role="list"
        aria-label="Recently viewed"
      >
        {recent.map((c) => (
          <div
            key={c.id}
            className="snap-start flex-shrink-0 w-[200px] sm:w-[220px]"
            role="listitem"
          >
            <CollectionCard collection={c} {...cardProps} />
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Main grid ────────────────────────────────────────────────────────────────

export function CollectionsGrid({
  collections,
  hiddenCollections = [],
  hasNewAutoCollections,
}: CollectionsGridProps) {
  const router = useRouter()
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorCollectionId, setEditorCollectionId] = useState<number | undefined>()
  const [overridesPanelId, setOverridesPanelId] = useState<number | null>(null)
  const [overridesPanelOpen, setOverridesPanelOpen] = useState(false)
  const [showHidden, setShowHidden] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  // ── Multi-select ───────────────────────────────────────────────────────────
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [isBulkWorking, setIsBulkWorking] = useState(false)

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false)
    setSelectedIds(new Set())
  }, [])

  // ── All displayable collections (visible + optional hidden) ────────────────
  const allCollections = useMemo(
    () => [...collections, ...(showHidden ? hiddenCollections : [])],
    [collections, hiddenCollections, showHidden],
  )

  // ── Search filter ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return allCollections
    return allCollections.filter(
      (c) =>
        c.name.toLowerCase().includes(q),
    )
  }, [allCollections, search])

  // ── Group by generatedFrom ─────────────────────────────────────────────────
  const groups = useMemo(() => {
    const knownKeys = new Set(GROUP_DEFS.map((g) => g.key as string))
    return GROUP_DEFS.map((def) => ({
      ...def,
      items: filtered.filter((c) => (c.generatedFrom ?? 'manual') === def.key),
    }))
      .filter((g) => g.items.length > 0)
      .concat(
        // Catch-all for unknown generatedFrom values (future-proof)
        (() => {
          const ungrouped = filtered.filter(
            (c) => c.generatedFrom && !knownKeys.has(c.generatedFrom),
          )
          return ungrouped.length > 0
            ? [{ key: '__other__', label: 'OTHER', defaultExpanded: false, items: ungrouped }]
            : []
        })(),
      )
  }, [filtered])

  const hasManualGroup = groups.some((g) => g.key === 'manual')

  // ── Action handlers ────────────────────────────────────────────────────────
  const handleBulkHide = async () => {
    if (selectedIds.size === 0) return
    setIsBulkWorking(true)
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          fetch(`/api/smart-collections/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isHidden: true }),
          }),
        ),
      )
      toast.success(`${selectedIds.size} view${selectedIds.size > 1 ? 's' : ''} hidden`)
      exitSelectionMode()
      router.refresh()
    } catch {
      toast.error('Bulk hide failed')
    } finally {
      setIsBulkWorking(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    setIsBulkWorking(true)
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          fetch(`/api/smart-collections/${id}`, { method: 'DELETE' }),
        ),
      )
      toast.success(`${selectedIds.size} view${selectedIds.size > 1 ? 's' : ''} deleted`)
      exitSelectionMode()
      router.refresh()
    } catch {
      toast.error('Bulk delete failed')
    } finally {
      setIsBulkWorking(false)
    }
  }

  const handleEditRules = useCallback((id: number) => {
    setEditorCollectionId(id)
    setEditorOpen(true)
  }, [])

  const handleManageAssets = useCallback((id: number) => {
    setOverridesPanelId(id)
    setOverridesPanelOpen(true)
  }, [])

  const handleNewCollection = useCallback(() => {
    setEditorCollectionId(undefined)
    setEditorOpen(true)
  }, [])

  const handleHide = async (id: number, hidden: boolean) => {
    const res = await fetch(`/api/smart-collections/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isHidden: hidden }),
    })
    if (!res.ok) throw new Error('Hide failed')
    toast.success(hidden ? 'View hidden' : 'View visible again')
    router.refresh()
  }

  const handleDelete = async (id: number) => {
    const res = await fetch(`/api/smart-collections/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Delete failed')
    router.refresh()
  }

  const handleDuplicate = async (id: number) => {
    const res = await fetch(`/api/smart-collections/${id}/duplicate`, { method: 'POST' })
    if (!res.ok) throw new Error('Duplicate failed')
    toast.success('View duplicated')
    router.refresh()
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const res = await fetch('/api/smart-collections/generate', { method: 'POST' })
      if (!res.ok) throw new Error('Generate failed')
      toast.success('Views generated from your media metadata')
      router.refresh()
    } catch {
      toast.error('Generation failed — try again')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSaveRules = async (filterQuery: Record<string, unknown>, name?: string) => {
    if (editorCollectionId) {
      const res = await fetch(`/api/smart-collections/${editorCollectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filterQuery, isSystemGenerated: false }),
      })
      if (!res.ok) throw new Error('Update failed')
      toast.success('Rules updated')
    } else {
      const res = await fetch('/api/smart-collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name || 'New View', filterQuery }),
      })
      if (!res.ok) throw new Error('Create failed')
      toast.success('View created')
    }
    router.refresh()
  }

  // Shared card callback props for the recent strip (no selection state)
  const recentCardProps: Omit<React.ComponentProps<typeof CollectionCard>, 'collection'> = {
    onHide: handleHide,
    onDelete: handleDelete,
    onDuplicate: handleDuplicate,
    onEditRules: handleEditRules,
    onManageAssets: handleManageAssets,
    selectionMode: false,
    selected: false,
    onToggleSelect: toggleSelect,
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (collections.length === 0 && hiddenCollections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-6 text-center">
        <div className="w-16 h-16 rounded-[24px] bg-[#f3f3f4] flex items-center justify-center">
          <Layers className="text-[#d5c4af]" size={28} />
        </div>
        <div className="space-y-2 max-w-xs">
          <p className="text-sm font-medium text-[#1a1c1c]/60">No views yet</p>
          <p className="text-xs text-[#1a1c1c]/40 leading-relaxed">
            Your first views will appear here automatically after you upload assets, or create one
            with custom rules.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            variant="outline"
            className={cn(
              'rounded-[20px] gap-2 border-[#d5c4af]/40 text-[#1a1c1c]/60',
              'hover:border-gallery-gold/40 hover:text-gallery-gold hover:bg-gallery-gold/[0.03]',
            )}
          >
            <RefreshCw size={14} className={isGenerating ? 'animate-spin' : ''} />
            {isGenerating ? 'Generating…' : 'Generate from uploads'}
          </Button>
          <Button
            onClick={handleNewCollection}
            className="bg-gradient-to-r from-[#7f5700] to-[#d79922] text-white rounded-[24px] gap-2 px-6"
          >
            <Sparkles size={14} />
            Create a View
          </Button>
        </div>

        <CollectionRuleEditor
          open={editorOpen}
          onOpenChange={setEditorOpen}
          onSave={handleSaveRules}
        />
      </div>
    )
  }

  return (
    <>
      {/* ── Search + Toolbar ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 mb-5">
        {/* Search bar */}
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#1a1c1c]/30 pointer-events-none"
          />
          <input
            ref={searchRef}
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search views…"
            aria-label="Search collections"
            className={cn(
              'w-full pl-9 pr-4 py-2.5 rounded-[16px] text-sm',
              'bg-[#f3f3f4] dark:bg-white/[0.06]',
              'text-[#1a1c1c] dark:text-white placeholder:text-[#1a1c1c]/30',
              'outline-none focus:ring-2 focus:ring-[#d79922]/30',
              'transition-shadow',
            )}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1a1c1c]/30 hover:text-[#1a1c1c] transition-colors"
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Sub-toolbar */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {hasNewAutoCollections && (
              <div className="flex items-center gap-1.5 bg-gallery-gold/10 rounded-full px-3 py-1.5 text-xs text-gallery-gold font-semibold">
                <span className="font-rubik">✦</span> New auto-views
              </div>
            )}
            {hiddenCollections.length > 0 && (
              <button
                onClick={() => setShowHidden((v) => !v)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                  showHidden
                    ? 'bg-[#1a1c1c]/[0.06] text-[#1a1c1c]'
                    : 'text-[#1a1c1c]/40 hover:text-[#1a1c1c] hover:bg-[#f3f3f4]',
                )}
                aria-pressed={showHidden}
              >
                {showHidden ? <EyeOff size={13} /> : <Eye size={13} />}
                {showHidden ? 'Hide hidden' : `Show hidden (${hiddenCollections.length})`}
              </button>
            )}
            <button
              onClick={() => (selectionMode ? exitSelectionMode() : setSelectionMode(true))}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                selectionMode
                  ? 'bg-[#1a1c1c]/[0.06] text-[#1a1c1c]'
                  : 'text-[#1a1c1c]/40 hover:text-[#1a1c1c] hover:bg-[#f3f3f4]',
              )}
              aria-pressed={selectionMode}
            >
              <CheckSquare size={13} />
              {selectionMode ? 'Cancel select' : 'Select'}
            </button>
          </div>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className={cn(
              'flex items-center gap-1.5 text-xs font-medium text-[#1a1c1c]/40',
              'hover:text-gallery-gold transition-colors disabled:opacity-40',
            )}
            title="Scan your media and auto-generate views from metadata"
          >
            <RefreshCw size={13} className={isGenerating ? 'animate-spin' : ''} />
            {isGenerating ? 'Generating…' : 'Refresh views'}
          </button>
        </div>
      </div>

      {/* ── Bulk action bar ───────────────────────────────────────────────── */}
      {selectionMode && (
        <div
          className={cn(
            'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
            'flex items-center gap-3 px-4 py-3 rounded-[24px]',
            'bg-white/90 backdrop-blur-[20px] shadow-[0px_8px_32px_rgba(26,28,28,0.18)]',
            'transition-all duration-200',
            selectedIds.size === 0 && 'opacity-60',
          )}
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
          role="toolbar"
          aria-label="Bulk actions"
        >
          <span className="text-sm font-medium text-[#1a1c1c] min-w-[80px] text-center">
            {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Tap to select'}
          </span>
          <div className="w-px h-4 bg-[#d5c4af]/40" />
          <button
            onClick={handleBulkHide}
            disabled={selectedIds.size === 0 || isBulkWorking}
            className="flex items-center gap-1.5 text-sm text-[#1a1c1c]/70 hover:text-[#1a1c1c] disabled:opacity-40 transition-colors px-2 py-1 rounded-[12px] hover:bg-[#f3f3f4]"
          >
            <HideIcon size={14} />
            Hide
          </button>
          <button
            onClick={handleBulkDelete}
            disabled={selectedIds.size === 0 || isBulkWorking}
            className="flex items-center gap-1.5 text-sm text-[#bb1800] hover:text-[#9a1400] disabled:opacity-40 transition-colors px-2 py-1 rounded-[12px] hover:bg-[#bb1800]/[0.06]"
          >
            <Trash2 size={14} />
            Delete
          </button>
          <button
            onClick={exitSelectionMode}
            className="ml-1 p-1 rounded-full text-[#1a1c1c]/40 hover:text-[#1a1c1c] hover:bg-[#f3f3f4] transition-colors"
            aria-label="Exit selection"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Select-all ────────────────────────────────────────────────────── */}
      {selectionMode && allCollections.length > 0 && (
        <div className="flex justify-center mb-3">
          <button
            onClick={() => {
              if (selectedIds.size === allCollections.length) {
                setSelectedIds(new Set())
              } else {
                setSelectedIds(new Set(allCollections.map((c) => c.id)))
              }
            }}
            className="text-xs text-[#1a1c1c]/50 hover:text-gallery-gold transition-colors"
          >
            {selectedIds.size === allCollections.length ? 'Deselect all' : 'Select all'}
          </button>
        </div>
      )}

      {/* ── Section A: Recent strip ────────────────────────────────────────── */}
      {!search && !selectionMode && (
        <RecentStrip
          allCollections={allCollections}
          cardProps={recentCardProps}
        />
      )}

      {/* ── Section B: Grouped collections ────────────────────────────────── */}
      {groups.length === 0 && search ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <p className="text-sm text-[#1a1c1c]/50">
            No views matching <em>&ldquo;{search}&rdquo;</em>
          </p>
          <button
            onClick={handleNewCollection}
            className="flex items-center gap-1.5 text-sm text-gallery-gold font-semibold hover:opacity-70 transition-opacity"
          >
            <Plus size={14} /> Create one
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {groups.map((group) => (
            <CollectionGroupSection
              key={group.key}
              label={group.label}
              count={group.items.length}
              defaultExpanded={group.defaultExpanded}
            >
              {group.items.map((c) => (
                <CollectionCard
                  key={c.id}
                  collection={c}
                  onHide={handleHide}
                  onDelete={handleDelete}
                  onDuplicate={handleDuplicate}
                  onEditRules={handleEditRules}
                  onManageAssets={handleManageAssets}
                  selectionMode={selectionMode}
                  selected={selectedIds.has(c.id)}
                  onToggleSelect={toggleSelect}
                />
              ))}
              {/* New Collection card lives inside MANUAL group */}
              {group.key === 'manual' && !selectionMode && (
                <NewCollectionCard onClick={handleNewCollection} />
              )}
            </CollectionGroupSection>
          ))}

          {/* If no MANUAL group, add New Collection card after all groups */}
          {!hasManualGroup && !selectionMode && (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pt-2">
              <NewCollectionCard onClick={handleNewCollection} />
            </div>
          )}
        </div>
      )}

      {/* ── Editors ──────────────────────────────────────────────────────── */}
      <CollectionRuleEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        collectionId={editorCollectionId}
        collectionName={allCollections.find((c) => c.id === editorCollectionId)?.name}
        onSave={handleSaveRules}
      />

      {overridesPanelId && (
        <ManualOverridesPanel
          open={overridesPanelOpen}
          onOpenChange={setOverridesPanelOpen}
          collectionId={overridesPanelId}
        />
      )}
    </>
  )
}
