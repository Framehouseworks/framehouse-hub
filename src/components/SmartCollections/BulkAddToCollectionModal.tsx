'use client'

import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Bookmark, Plus, Check, Loader2, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/utilities/cn'
import { useRouter } from 'next/navigation'

interface ManualCollection {
  id: number
  name: string
  existingIncludes: number[]
}

interface BulkAddToCollectionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mediaIds: number[]
  onSuccess?: () => void
}

export function BulkAddToCollectionModal({
  open,
  onOpenChange,
  mediaIds,
  onSuccess,
}: BulkAddToCollectionModalProps) {
  const router = useRouter()
  const [collections, setCollections] = useState<ManualCollection[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const newNameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setIsLoading(true)
    setSelected(new Set())
    setSearch('')
    fetch('/api/smart-collections?limit=100&depth=1&sort=-sortOrder,-updatedAt', {
      credentials: 'include',
    })
      .then((r) => r.json())
      .then((data) => {
        const docs: Array<{
          id: number
          name: string
          generatedFrom?: string
          manualIncludes?: Array<number | { id: number }>
        }> = data?.docs ?? []
        setCollections(
          docs
            .filter((c) => (c.generatedFrom ?? 'manual') === 'manual')
            .map((c) => ({
              id: c.id,
              name: c.name,
              existingIncludes: (c.manualIncludes ?? []).map((i) =>
                typeof i === 'object' ? i.id : i,
              ),
            })),
        )
      })
      .catch(() => toast.error('Could not load collections'))
      .finally(() => setIsLoading(false))
  }, [open])

  const handleSave = async () => {
    if (selected.size === 0) return
    setIsSaving(true)
    try {
      await Promise.all(
        Array.from(selected).map(async (colId) => {
          const col = collections.find((c) => c.id === colId)
          if (!col) return
          const merged = Array.from(new Set([...col.existingIncludes, ...mediaIds]))
          await fetch(`/api/smart-collections/${colId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ manualIncludes: merged }),
          })
        }),
      )
      const colNames = Array.from(selected)
        .map((id) => collections.find((c) => c.id === id)?.name)
        .filter(Boolean)
        .join(', ')
      toast.success(
        `${mediaIds.length} asset${mediaIds.length !== 1 ? 's' : ''} added to ${colNames}`,
      )
      onOpenChange(false)
      onSuccess?.()
      router.refresh()
    } catch {
      toast.error('Failed to add to collections — try again')
    } finally {
      setIsSaving(false)
    }
  }

  const createCollection = async () => {
    const trimmed = newName.trim()
    if (!trimmed) return
    setIsCreating(true)
    try {
      const res = await fetch('/api/smart-collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: trimmed,
          filterQuery: {},
          generatedFrom: 'manual',
          manualIncludes: mediaIds,
        }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      const created = data.doc ?? data
      toast.success(`${created.name} created with ${mediaIds.length} asset${mediaIds.length !== 1 ? 's' : ''}`)
      setNewName('')
      setShowCreate(false)
      onOpenChange(false)
      onSuccess?.()
      router.refresh()
    } catch {
      toast.error('Could not create collection')
    } finally {
      setIsCreating(false)
    }
  }

  const filtered = search
    ? collections.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : collections

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[28px] border-none shadow-[0_40px_80px_-20px_rgba(0,0,0,0.2)] sm:max-w-[400px] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-[10px] bg-gallery-gold/10 flex items-center justify-center">
              <Bookmark className="h-3.5 w-3.5 text-gallery-gold" />
            </div>
            <DialogTitle className="font-inter text-base font-semibold text-primary">
              Add {mediaIds.length} asset{mediaIds.length !== 1 ? 's' : ''} to collection
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* Search */}
        <div className="px-4 pb-2">
          <div className="relative rounded-[12px] bg-black/[0.04] dark:bg-white/[0.05] focus-within:shadow-[0_0_0_2px_rgba(215,153,34,0.35)] transition-shadow">
            <Search
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface/30 pointer-events-none"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search collections…"
              className="w-full pl-8 pr-8 py-2 bg-transparent text-sm text-primary placeholder:text-on-surface/30 outline-none focus:outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface/30 hover:text-primary focus:outline-none"
                aria-label="Clear"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto max-h-[240px] px-3 pb-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={18} className="animate-spin text-on-surface/30" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center font-inter text-[11px] text-on-surface/30 py-6 px-3">
              {search ? `No collections matching "${search}"` : 'No manual collections yet'}
            </p>
          ) : (
            filtered.map((col) => {
              const isSelected = selected.has(col.id)
              const alreadyAdded = mediaIds.every((id) => col.existingIncludes.includes(id))
              return (
                <button
                  key={col.id}
                  onClick={() => {
                    if (alreadyAdded) return
                    setSelected((prev) => {
                      const next = new Set(prev)
                      if (isSelected) { next.delete(col.id) } else { next.add(col.id) }
                      return next
                    })
                  }}
                  disabled={alreadyAdded}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 rounded-[12px] text-left transition-colors min-h-[48px]',
                    alreadyAdded
                      ? 'opacity-40 cursor-default'
                      : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.05] active:bg-black/[0.06] dark:active:bg-white/[0.07]',
                  )}
                  aria-pressed={isSelected}
                  aria-label={`${isSelected ? 'Deselect' : 'Select'} ${col.name}`}
                >
                  <div
                    className={cn(
                      'w-5 h-5 rounded-[6px] flex items-center justify-center flex-shrink-0 transition-colors',
                      isSelected || alreadyAdded ? 'bg-gallery-gold' : 'bg-[#eeeeee]',
                    )}
                  >
                    {(isSelected || alreadyAdded) && (
                      <Check size={11} className="text-white" strokeWidth={2.5} />
                    )}
                  </div>
                  <span className="font-inter text-sm text-primary flex-1 truncate">
                    {col.name}
                  </span>
                  {alreadyAdded && (
                    <span className="font-rubik text-[9px] text-on-surface/30 uppercase tracking-wider">
                      Already in
                    </span>
                  )}
                </button>
              )
            })
          )}
        </div>

        {/* New collection row */}
        <div className="px-4 pt-2 pb-1 border-t border-black/[0.06] dark:border-white/[0.06]">
          {showCreate ? (
            <div className="flex gap-2 py-1 min-w-0">
              <div className="flex-1 min-w-0 rounded-[10px] bg-black/[0.04] dark:bg-white/[0.05] focus-within:shadow-[0_0_0_2px_rgba(215,153,34,0.35)] transition-shadow">
                <input
                  ref={newNameRef}
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') createCollection()
                    if (e.key === 'Escape') {
                      setShowCreate(false)
                      setNewName('')
                    }
                  }}
                  placeholder="New collection name…"
                  autoFocus
                  className="w-full px-3 py-2 bg-transparent text-sm text-primary placeholder:text-on-surface/30 outline-none focus:outline-none"
                />
              </div>
              <button
                onClick={createCollection}
                disabled={!newName.trim() || isCreating}
                className="px-3 py-2 rounded-[10px] bg-gradient-to-r from-[#7f5700] to-[#d79922] text-white text-[11px] font-bold disabled:opacity-40"
              >
                {isCreating ? <Loader2 size={12} className="animate-spin" /> : 'Create'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setShowCreate(true)
                setTimeout(() => newNameRef.current?.focus(), 50)
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-[12px] text-on-surface/50 hover:text-primary hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors text-sm min-h-[44px]"
            >
              <Plus size={14} />
              <span className="font-inter">New collection</span>
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 pb-5 pt-3 flex gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="flex-1 h-11 rounded-[16px] text-on-surface/50"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={selected.size === 0 || isSaving}
            className="flex-1 h-11 rounded-[16px] bg-gradient-to-r from-[#7f5700] to-[#d79922] text-white font-semibold disabled:opacity-40 shadow-[0_6px_16px_rgba(215,153,34,0.2)]"
          >
            {isSaving
              ? 'Adding…'
              : selected.size > 0
                ? `Add to ${selected.size} collection${selected.size !== 1 ? 's' : ''}`
                : 'Select a collection'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
