'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Layers, Sparkles, Eye, EyeOff, RefreshCw } from 'lucide-react'
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
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className={cn(
            'flex items-center gap-1.5 text-xs font-medium text-[#1a1c1c]/40',
            'hover:text-gallery-gold transition-colors disabled:opacity-40',
          )}
          title="Scan your media and auto-generate collections from metadata (tags, shoot names, camera models, dates)"
        >
          <RefreshCw size={13} className={isGenerating ? 'animate-spin' : ''} />
          {isGenerating ? 'Generating…' : 'Refresh collections'}
        </button>
      </div>

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
          />
        ))}

        <NewCollectionCard onClick={handleNewCollection} />
      </div>

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
          includes={[]}
          excludes={[]}
          onAddInclude={() => {}}
          onAddExclude={() => {}}
          onRemoveInclude={() => {}}
          onRemoveExclude={() => {}}
        />
      )}
    </>
  )
}
