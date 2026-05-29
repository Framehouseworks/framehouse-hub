'use client'

import React, { useState, useCallback, useMemo, useEffect } from 'react'
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
  Loader2,
  Plus,
  Bookmark,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SearchInput } from '@/components/ui/search-input'
import { cn } from '@/utilities/cn'
import { CollectionCard, type CollectionCardData } from './CollectionCard'
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
  { key: 'camera', label: 'BY CAMERA', defaultExpanded: true },
  { key: 'date', label: 'BY DATE', defaultExpanded: false },
  { key: 'location', label: 'BY LOCATION', defaultExpanded: false },
  { key: 'manual', label: 'MANUAL', defaultExpanded: true },
]

const RECENT_KEY = 'fh_recent_collections'

// ─── Inline "New Collection" button shown in the Manual section header ────────
// Always visible at the top of the section — no scrolling required.

function NewCollectionInlineButton({
  onCreateManual,
}: {
  onCreateManual: (name: string) => Promise<void>
}) {
  const [isNaming, setIsNaming] = useState(false)
  const [name, setName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (isNaming) inputRef.current?.focus()
  }, [isNaming])

  const commit = async () => {
    const trimmed = name.trim()
    if (!trimmed) { setIsNaming(false); setName(''); return }
    setIsSaving(true)
    try {
      await onCreateManual(trimmed)
      setName('')
      setIsNaming(false)
    } catch { /* parent handles toast */ }
    finally { setIsSaving(false) }
  }

  if (isNaming) {
    return (
      <div className="flex items-center gap-1.5">
        {/* Container gets focus ring — not the input */}
        <div className="rounded-[12px] bg-black/[0.04] dark:bg-white/[0.05] focus-within:shadow-[0_0_0_2px_rgba(215,153,34,0.35)] transition-shadow">
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit()
              if (e.key === 'Escape') { setIsNaming(false); setName('') }
            }}
            placeholder="Collection name…"
            className="px-3 py-1.5 text-xs text-primary bg-transparent outline-none focus:outline-none placeholder:text-on-surface/30 w-[160px]"
            aria-label="New collection name"
          />
        </div>
        <button
          onClick={commit}
          disabled={!name.trim() || isSaving}
          className="h-7 px-2.5 rounded-[10px] bg-gallery-gold text-white text-[11px] font-bold disabled:opacity-40 transition-opacity flex items-center gap-1"
          aria-label="Create collection"
        >
          {isSaving ? <Loader2 size={11} className="animate-spin" /> : 'Create'}
        </button>
        <button
          onClick={() => { setIsNaming(false); setName('') }}
          className="h-7 w-7 rounded-[10px] bg-black/[0.04] dark:bg-white/[0.05] flex items-center justify-center text-on-surface/40 hover:text-primary transition-colors"
          aria-label="Cancel"
        >
          <X size={12} />
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setIsNaming(true)}
      className="flex items-center gap-1.5 text-[10px] font-medium text-on-surface/40 hover:text-gallery-gold transition-colors py-1 px-2 rounded-[8px] hover:bg-gallery-gold/[0.06] focus:outline-none focus-visible:shadow-[0_0_0_2px_rgba(215,153,34,0.35)]"
      aria-label="Create new manual collection"
    >
      <Plus size={12} />
      New
    </button>
  )
}

// ─── Recent section (localStorage-backed, responsive grid) ───────────────────
// Stays mounted during selection so cards never reshuffle under the user's
// pointer. Selection state is threaded in from the parent so the ring/tick
// renders correctly without any local state duplication.

function RecentStrip({
  allCollections,
  selectionMode,
  selectedIds,
  cardProps,
}: {
  allCollections: CollectionCardData[]
  selectionMode: boolean
  selectedIds: Set<number>
  cardProps: Omit<React.ComponentProps<typeof CollectionCard>, 'collection' | 'selectionMode' | 'selected'>
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
        .filter(Boolean)
        .slice(0, 4) as CollectionCardData[],
    [recentIds, allCollections],
  )

  if (recent.length < 2) return null

  return (
    // Tonal surface card provides clear spatial demarcation from the grouped
    // sections below — uses the platform's layering principle (surface_container_low)
    // rather than a 1px border (prohibited by DESIGN.md).
    <section aria-label="Recently viewed collections" className="mb-6 w-full">
      <div className="bg-[#f5f4f2] dark:bg-white/[0.03] rounded-[20px] p-4">
        <p className="text-[10px] tracking-widest font-medium text-on-surface/40 uppercase pb-3 select-none">
          RECENT
        </p>
        <div
          className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
          role="list"
          aria-label="Recently viewed"
        >
          {recent.map((c) => (
            <div key={c.id} className="min-w-0" role="listitem">
              <CollectionCard
                collection={c}
                {...cardProps}
                selectionMode={selectionMode}
                selected={selectedIds.has(c.id)}
              />
            </div>
          ))}
        </div>
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

  // ── Multi-select ───────────────────────────────────────────────────────────
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [isBulkWorking, setIsBulkWorking] = useState(false)

  const toggleSelect = useCallback((id: number) => {
    setSelectionMode(true) // enter selection mode on first circle tap — matches MediaGrid behaviour
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
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

  const handleNewManualCollection = useCallback(async (name: string) => {
    const res = await fetch('/api/smart-collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, filterQuery: {}, generatedFrom: 'manual' }),
    })
    if (!res.ok) throw new Error('Create failed')
    toast.success(`${name} created`)
    router.refresh()
  }, [router])

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

  // Callback-only props shared into RecentStrip. selectionMode/selected are
  // injected per-card inside RecentStrip using live parent state.
  const recentCardProps: Omit<React.ComponentProps<typeof CollectionCard>, 'collection' | 'selectionMode' | 'selected'> = {
    onHide: handleHide,
    onDelete: handleDelete,
    onDuplicate: handleDuplicate,
    onEditRules: handleEditRules,
    onManageAssets: handleManageAssets,
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
          <p className="text-sm font-medium text-on-surface/60">No collections yet</p>
          <p className="text-xs text-on-surface/40 leading-relaxed">
            Create a manual collection to curate assets by hand, or generate smart views
            automatically from your media.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            variant="outline"
            className={cn(
              'rounded-[20px] gap-2 border-[#d5c4af]/40 text-on-surface/60',
              'hover:border-gallery-gold/40 hover:text-gallery-gold hover:bg-gallery-gold/[0.03]',
            )}
          >
            <RefreshCw size={14} className={isGenerating ? 'animate-spin' : ''} />
            {isGenerating ? 'Generating…' : 'Generate smart views'}
          </Button>
          <Button
            onClick={() => handleNewManualCollection('New Collection').catch(() => {})}
            className="bg-gradient-to-r from-[#7f5700] to-[#d79922] text-white rounded-[24px] gap-2 px-6"
          >
            <Bookmark size={14} />
            New Collection
          </Button>
          <Button
            variant="ghost"
            onClick={handleNewCollection}
            className="rounded-[20px] gap-2 text-on-surface/40 hover:text-primary text-xs"
          >
            <Sparkles size={13} />
            Smart view with rules
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
        {/* Search — shared SearchInput with container-focus pattern */}
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search collections…"
          label="Search collections"
        />

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
                    ? 'bg-[#1a1c1c]/[0.06] text-on-surface'
                    : 'text-on-surface/40 hover:text-on-surface hover:bg-black/[0.04] dark:hover:bg-white/[0.05]',
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
                  ? 'bg-[#1a1c1c]/[0.06] text-on-surface'
                  : 'text-on-surface/40 hover:text-on-surface hover:bg-black/[0.04] dark:hover:bg-white/[0.05]',
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
              'flex items-center gap-1.5 text-xs font-medium text-on-surface/40',
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
            'flex items-center gap-3 px-5 py-3 rounded-[28px]',
            'bg-white/95 dark:bg-[#0a0c10]/95 backdrop-blur-[20px]',
            'shadow-[0px_8px_32px_rgba(26,28,28,0.18)]',
            'transition-all duration-200',
            selectedIds.size === 0 && 'opacity-60',
          )}
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
          role="toolbar"
          aria-label="Bulk actions"
        >
          {/* Selection summary — count + first two names for orientation at scale */}
          <div className="flex flex-col justify-center min-w-[100px]">
            <span className="text-[10px] font-bold tracking-widest text-gallery-gold uppercase font-rubik leading-none mb-1">
              {selectedIds.size > 0 ? `${selectedIds.size} Selected` : 'Select mode'}
            </span>
            {selectedIds.size > 0 && (
              <span className="text-xs text-on-surface/60 truncate max-w-[160px] leading-tight">
                {(() => {
                  const names = allCollections
                    .filter((c) => selectedIds.has(c.id))
                    .map((c) => c.name)
                  if (names.length === 0) return null
                  if (names.length <= 2) return names.join(', ')
                  return `${names[0]}, ${names[1]} +${names.length - 2}`
                })()}
              </span>
            )}
          </div>

          <div className="w-px h-8 bg-[#d5c4af]/40 shrink-0" />

          <button
            onClick={handleBulkHide}
            disabled={selectedIds.size === 0 || isBulkWorking}
            className="flex items-center gap-1.5 text-sm text-on-surface/70 hover:text-on-surface disabled:opacity-40 transition-colors px-2 py-1 rounded-[12px] hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
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

          <div className="w-px h-8 bg-[#d5c4af]/40 shrink-0" />

          <button
            onClick={exitSelectionMode}
            className="p-1.5 rounded-full text-on-surface/40 hover:text-on-surface hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors"
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
            className="text-xs text-on-surface/50 hover:text-gallery-gold transition-colors"
          >
            {selectedIds.size === allCollections.length ? 'Deselect all' : 'Select all'}
          </button>
        </div>
      )}

      {/* ── Section A: Recent strip ────────────────────────────────────────── */}
      {/* Hidden during search (irrelevant to results) but kept mounted during
          selection so cards never reshuffle and remain visible as an anchor. */}
      {!search && (
        <RecentStrip
          allCollections={allCollections}
          selectionMode={selectionMode}
          selectedIds={selectedIds}
          cardProps={recentCardProps}
        />
      )}

      {/* ── Section B: Grouped collections ────────────────────────────────── */}
      {groups.length === 0 && search ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <p className="text-sm text-on-surface/50">
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
              headerAction={
                group.key === 'manual' && !selectionMode ? (
                  <NewCollectionInlineButton onCreateManual={handleNewManualCollection} />
                ) : undefined
              }
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
            </CollectionGroupSection>
          ))}

          {/* If no MANUAL group yet, show standalone "+ New Collection" header action */}
          {!hasManualGroup && !selectionMode && (
            <div className="flex items-center justify-between py-2.5">
              <span className="text-[10px] tracking-widest font-medium text-on-surface/40 uppercase select-none">
                MANUAL
              </span>
              <NewCollectionInlineButton onCreateManual={handleNewManualCollection} />
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
