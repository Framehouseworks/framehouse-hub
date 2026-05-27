'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Layers, Sparkles, Eye, EyeOff, RefreshCw, CheckSquare, X, Trash2, EyeOff as HideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/utilities/cn'
import { CollectionCard, type CollectionCardData } from './CollectionCard'
import { NewCollectionCard } from './NewCollectionCard'
import { CollectionRuleEditor } from './CollectionRuleEditor'
import { ManualOverridesPanel } from './ManualOverridesPanel'
import { toast } from 'sonner'

interface CollectionsGridProps {
  collections: CollectionCardData[]
  hiddenCollections?: CollectionCardData[]
  hasNewAutoCollections?: boolean
}

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

  // ── Multi-select ──────────────────────────────────────────────────────────
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [isBulkWorking, setIsBulkWorking] = useState(false)

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }, [])

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false)
    setSelectedIds(new Set())
  }, [])

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
      toast.success(`${selectedIds.size} collection${selectedIds.size > 1 ? 's' : ''} hidden`)
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
      toast.success(`${selectedIds.size} collection${selectedIds.size > 1 ? 's' : ''} deleted`)
      exitSelectionMode()
      router.refresh()
    } catch {
      toast.error('Bulk delete failed')
    } finally {
      setIsBulkWorking(false)
    }
  }

  // ── Single-item actions ───────────────────────────────────────────────────
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
    toast.success(hidden ? 'Collection hidden' : 'Collection visible again')
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
    toast.success('Collection duplicated')
    router.refresh()
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const res = await fetch('/api/smart-collections/generate', { method: 'POST' })
      if (!res.ok) throw new Error('Generate failed')
      toast.success('Collections generated from your media metadata')
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
        body: JSON.stringify({ name: name || 'New Collection', filterQuery }),
      })
      if (!res.ok) throw new Error('Create failed')
      toast.success('Collection created')
    }
    router.refresh()
  }

  const visibleHidden = showHidden ? hiddenCollections : []
  const allCollections = [...collections, ...visibleHidden]

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (collections.length === 0 && hiddenCollections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-6 text-center">
        <div className="w-16 h-16 rounded-[24px] bg-[#f3f3f4] flex items-center justify-center">
          <Layers className="text-[#d5c4af]" size={28} />
        </div>
        <div className="space-y-2 max-w-xs">
          <p className="text-sm font-medium text-[#1a1c1c]/60">No collections yet</p>
          <p className="text-xs text-[#1a1c1c]/40 leading-relaxed">
            Collections are generated automatically when you upload media, or you can create one
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
            Create Collection
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
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {hasNewAutoCollections && (
            <div className="flex items-center gap-1.5 bg-gallery-gold/10 rounded-full px-3 py-1.5 text-xs text-gallery-gold font-semibold">
              <span className="font-rubik">✦</span> New auto-collections
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
          {/* Select mode toggle */}
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
          title="Scan your media and auto-generate collections from metadata"
        >
          <RefreshCw size={13} className={isGenerating ? 'animate-spin' : ''} />
          {isGenerating ? 'Generating…' : 'Refresh collections'}
        </button>
      </div>

      {/* Bulk action bar */}
      {selectionMode && (
        <div
          className={cn(
            'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
            'flex items-center gap-3 px-4 py-3 rounded-[24px]',
            'bg-white/90 backdrop-blur-[20px] shadow-[0px_8px_32px_rgba(26,28,28,0.18)]',
            'transition-all duration-200',
            selectedIds.size === 0 && 'opacity-60',
          )}
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

      {/* Grid */}
      <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {collections.map((collection) => (
          <CollectionCard
            key={collection.id}
            collection={collection}
            onHide={handleHide}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
            onEditRules={handleEditRules}
            onManageAssets={handleManageAssets}
            selectionMode={selectionMode}
            selected={selectedIds.has(collection.id)}
            onToggleSelect={toggleSelect}
          />
        ))}

        {/* Hidden collections (when revealed) */}
        {visibleHidden.map((collection) => (
          <CollectionCard
            key={collection.id}
            collection={collection}
            onHide={handleHide}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
            onEditRules={handleEditRules}
            onManageAssets={handleManageAssets}
            selectionMode={selectionMode}
            selected={selectedIds.has(collection.id)}
            onToggleSelect={toggleSelect}
          />
        ))}

        {!selectionMode && <NewCollectionCard onClick={handleNewCollection} />}
      </div>

      {/* Select-all helper when in selection mode */}
      {selectionMode && allCollections.length > 0 && (
        <div className="mt-4 flex justify-center">
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

      {/* Editors */}
      <CollectionRuleEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        collectionId={editorCollectionId}
        collectionName={
          [...collections, ...hiddenCollections].find((c) => c.id === editorCollectionId)?.name
        }
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
