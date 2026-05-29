'use client'

import { useState, useEffect, useRef } from 'react'
import { Bookmark, Plus, Check, Loader2, Search, X } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { toast } from 'sonner'
import { cn } from '@/utilities/cn'
import { useRouter } from 'next/navigation'

interface ManualCollection {
  id: number
  name: string
}

interface CollectionPickerPopoverProps {
  mediaId: number
  trigger: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return isMobile
}

function PickerContent({
  mediaId,
}: {
  mediaId: number
}) {
  const router = useRouter()
  const [collections, setCollections] = useState<ManualCollection[]>([])
  const [membership, setMembership] = useState<Set<number>>(new Set())
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const newNameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setIsLoading(true)
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
        const manual = docs.filter((c) => (c.generatedFrom ?? 'manual') === 'manual')
        setCollections(manual.map((c) => ({ id: c.id, name: c.name })))
        const inSet = new Set<number>()
        manual.forEach((col) => {
          const ids = (col.manualIncludes ?? []).map((i) =>
            typeof i === 'object' ? i.id : i,
          )
          if (ids.includes(mediaId)) inSet.add(col.id)
        })
        setMembership(inSet)
      })
      .catch(() => toast.error('Could not load collections'))
      .finally(() => setIsLoading(false))
  }, [mediaId])

  const toggle = async (colId: number, colName: string) => {
    const isMember = membership.has(colId)
    setMembership((prev) => {
      const next = new Set(prev)
      if (isMember) { next.delete(colId) } else { next.add(colId) }
      return next
    })
    try {
      const r = await fetch(`/api/smart-collections/${colId}?depth=0`, { credentials: 'include' })
      const data = await r.json()
      const current: number[] = (data.manualIncludes ?? []).map((i: number | { id: number }) =>
        typeof i === 'object' ? i.id : i,
      )
      const updated = isMember ? current.filter((id) => id !== mediaId) : [...current, mediaId]
      const res = await fetch(`/api/smart-collections/${colId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ manualIncludes: updated }),
      })
      if (!res.ok) throw new Error()
      if (isMember) {
        toast.success(`Removed from ${colName}`, {
          action: { label: 'Undo', onClick: () => toggle(colId, colName) },
        })
      } else {
        toast.success(`Added to ${colName}`, {
          action: {
            label: 'View →',
            onClick: () => router.push(`/dashboard/library/collections/${colId}`),
          },
        })
      }
      router.refresh()
    } catch {
      setMembership((prev) => {
        const next = new Set(prev)
        if (isMember) { next.add(colId) } else { next.delete(colId) }
        return next
      })
      toast.error('Failed to update collection')
    }
  }

  const createAndAdd = async () => {
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
          manualIncludes: [mediaId],
        }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      const created = data.doc ?? data
      setCollections((prev) => [{ id: created.id, name: created.name }, ...prev])
      setMembership((prev) => new Set([...prev, created.id]))
      setNewName('')
      setShowCreate(false)
      toast.success(`${created.name} created`, {
        action: {
          label: 'View →',
          onClick: () => router.push(`/dashboard/library/collections/${created.id}`),
        },
      })
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
    <div className="flex flex-col">
      {/* Search */}
      <div className="px-3 pt-3 pb-2">
        {/* Container gets focus ring — input is transparent */}
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
            autoFocus
            className="w-full pl-8 pr-8 py-2 bg-transparent text-sm text-primary placeholder:text-on-surface/30 outline-none focus:outline-none"
            aria-label="Search collections"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface/30 hover:text-primary transition-colors focus:outline-none"
              aria-label="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Collection list */}
      <div className="overflow-y-auto max-h-[240px] px-2 pb-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 size={16} className="animate-spin text-on-surface/30" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center font-inter text-[11px] text-on-surface/30 py-4 px-3">
            {search ? `No collections matching "${search}"` : 'No manual collections yet'}
          </p>
        ) : (
          filtered.map((col) => {
            const isMember = membership.has(col.id)
            return (
              <button
                key={col.id}
                onClick={() => toggle(col.id, col.name)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 rounded-[12px] text-left transition-colors min-h-[48px]',
                  'hover:bg-black/[0.04] dark:hover:bg-white/[0.05] active:bg-black/[0.06] dark:active:bg-white/[0.07]',
                )}
                aria-pressed={isMember}
                aria-label={isMember ? `Remove from ${col.name}` : `Add to ${col.name}`}
              >
                <div
                  className={cn(
                    'w-5 h-5 rounded-[6px] flex items-center justify-center flex-shrink-0 transition-colors',
                    isMember ? 'bg-gallery-gold' : 'bg-black/[0.07] dark:bg-white/[0.08]',
                  )}
                >
                  {isMember && <Check size={11} className="text-white" strokeWidth={2.5} />}
                </div>
                <span className="font-inter text-sm text-primary flex-1 truncate">{col.name}</span>
                <Bookmark
                  size={12}
                  className={cn(
                    'flex-shrink-0 transition-colors',
                    isMember ? 'text-gallery-gold fill-gallery-gold' : 'text-on-surface/20',
                  )}
                />
              </button>
            )
          })
        )}
      </div>

      {/* New collection row */}
      <div className="px-3 pb-3 pt-2 border-t border-black/[0.06] dark:border-white/[0.06]">
        {showCreate ? (
          <div className="flex gap-2 min-w-0">
            {/* Container gets ring */}
            <div className="flex-1 min-w-0 rounded-[10px] bg-black/[0.04] dark:bg-white/[0.05] focus-within:shadow-[0_0_0_2px_rgba(215,153,34,0.35)] transition-shadow">
              <input
                ref={newNameRef}
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') createAndAdd()
                  if (e.key === 'Escape') {
                    setShowCreate(false)
                    setNewName('')
                  }
                }}
                placeholder="Collection name…"
                autoFocus
                className="w-full px-3 py-2 bg-transparent text-sm text-primary placeholder:text-on-surface/30 outline-none focus:outline-none"
              />
            </div>
            <button
              onClick={createAndAdd}
              disabled={!newName.trim() || isCreating}
              className="px-3 py-2 rounded-[10px] bg-gradient-to-r from-[#7f5700] to-[#d79922] text-white text-[11px] font-bold disabled:opacity-40 transition-opacity flex items-center gap-1.5"
              aria-label="Create collection"
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
    </div>
  )
}

export function CollectionPickerPopover({
  mediaId,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: CollectionPickerPopoverProps) {
  const isMobile = useIsMobile()
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = controlledOnOpenChange ?? setInternalOpen

  if (isMobile) {
    return (
      <>
        <div onClick={() => setOpen(true)}>{trigger}</div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent
            side="bottom"
            className="rounded-t-[24px] p-0 border-none"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-[#eeeeee]" aria-hidden="true" />
            </div>
            <p className="font-rubik text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em] text-center py-3">
              Add to Collection
            </p>
            {open && <PickerContent mediaId={mediaId} />}
          </SheetContent>
        </Sheet>
      </>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="p-0 rounded-[20px] shadow-[0_20px_40px_rgba(26,28,28,0.12)] border-none w-[280px] overflow-hidden bg-white dark:bg-[#1a1c22]"
        aria-label="Add to collection"
      >
        <p className="font-rubik text-[9px] font-bold text-on-surface/30 uppercase tracking-[0.2em] px-4 pt-3 pb-0">
          Add to Collection
        </p>
        {open && <PickerContent mediaId={mediaId} />}
      </PopoverContent>
    </Popover>
  )
}
