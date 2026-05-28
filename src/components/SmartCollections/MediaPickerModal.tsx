'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Check, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/utilities/cn'
import { useMediaQuery } from '@/hooks/useMediaQuery'

interface PickerMedia {
  id: number
  thumbnailUrl?: string | null
  proxyUrl?: string | null
  originalUrl?: string | null
  title?: string | null
}

interface MediaPickerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'include' | 'exclude'
  alreadySelected?: (number | string)[]
  onConfirm: (selectedIds: number[]) => void
}

const MAX_SELECTION = 500

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

function MediaGrid({
  items,
  selected,
  onToggle,
}: {
  items: PickerMedia[]
  selected: Set<number>
  onToggle: (id: number) => void
}) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>, id: number) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onToggle(id)
      }
    },
    [onToggle],
  )

  return (
    <div
      role="grid"
      aria-label="Media assets"
      className="grid grid-cols-3 gap-2 lg:grid-cols-4"
    >
      {items.map((item) => {
        const src = item.thumbnailUrl ?? item.proxyUrl ?? item.originalUrl
        const isSelected = selected.has(item.id)
        return (
          <div
            key={item.id}
            role="gridcell"
            aria-selected={isSelected}
            tabIndex={0}
            onClick={() => onToggle(item.id)}
            onKeyDown={(e) => handleKeyDown(e, item.id)}
            className={cn(
              'relative aspect-square cursor-pointer overflow-hidden rounded-[12px]',
              'bg-[#f0ece6] transition-all duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d79922] focus-visible:ring-offset-1',
              isSelected && 'ring-2 ring-[#d79922] ring-offset-1',
            )}
          >
            {src ? (
              <Image
                src={src}
                alt={item.title ?? `Asset ${item.id}`}
                fill
                className="object-cover"
                sizes="(min-width: 1024px) 25vw, 33vw"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <span className="font-rubik text-[10px] text-[#1a1c1c]/40">No preview</span>
              </div>
            )}
            {isSelected && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#d79922]/80">
                <Check className="h-6 w-6 text-white drop-shadow" strokeWidth={3} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function PickerContent({
  mode,
  alreadySelected,
  onConfirm,
  onClose,
}: {
  mode: 'include' | 'exclude'
  alreadySelected?: (number | string)[]
  onConfirm: (ids: number[]) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<PickerMedia[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const debouncedQuery = useDebounce(query, 200)
  const alreadySet = useRef(
    new Set((alreadySelected ?? []).map((id) => Number(id))),
  )

  const fetchMedia = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (q.trim()) params.set('q', q.trim())
      const res = await fetch(`/api/media/search?${params}`)
      if (!res.ok) return
      const data: { docs: PickerMedia[] } = await res.json()
      setItems(data.docs.filter((d) => !alreadySet.current.has(d.id)))
    } catch {
      // silent — grid stays as-is
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMedia(debouncedQuery)
  }, [debouncedQuery, fetchMedia])

  const toggle = useCallback((id: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else if (next.size < MAX_SELECTION) {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleConfirm = () => {
    onConfirm(Array.from(selected))
    onClose()
  }

  const subtitle =
    mode === 'include' ? 'Adding to Always Include' : 'Adding to Always Exclude'

  return (
    <div className="flex h-full flex-col">
      {/* Search */}
      <div className="relative mx-4 mt-2 mb-3">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1a1c1c]/40" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search assets…"
          aria-label="Search assets"
          className={cn(
            'w-full rounded-[16px] border-0 bg-[#f0ece6] py-2.5 pl-9 pr-4 text-sm text-[#1a1c1c]',
            'placeholder:text-[#1a1c1c]/40 focus:outline-none focus:ring-2 focus:ring-[#d79922]',
          )}
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1a1c1c]/40 hover:text-[#1a1c1c]"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Subtitle inside content for sheet layout */}
      <p className="mx-4 mb-3 text-xs text-[#1a1c1c]/50">{subtitle}</p>

      {/* Grid */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        {loading && items.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-[#1a1c1c]/40">
            Loading…
          </div>
        ) : items.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-[#1a1c1c]/40">
            No assets found
          </div>
        ) : (
          <MediaGrid items={items} selected={selected} onToggle={toggle} />
        )}
      </div>

      {/* Bottom bar */}
      <div
        className={cn(
          'flex items-center justify-between gap-3 border-t border-[#d5c4af]/40 bg-white/80 px-4 pt-3 pb-3',
          'backdrop-blur-[24px]',
        )}
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <span className="text-sm text-[#1a1c1c]/60">
          {selected.size > 0 ? `${selected.size} selected` : 'None selected'}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="rounded-[16px] text-[#1a1c1c]/60 hover:text-[#1a1c1c]"
          >
            Cancel
          </Button>
          <button
            disabled={selected.size === 0}
            onClick={handleConfirm}
            className={cn(
              'rounded-[24px] px-5 py-2 text-sm font-medium text-white transition-opacity',
              'bg-gradient-to-r from-[#7f5700] to-[#d79922] shadow-[0px_4px_12px_rgba(215,153,34,0.35)]',
              selected.size === 0 && 'cursor-not-allowed opacity-40',
            )}
          >
            Add {selected.size > 0 ? `${selected.size} ` : ''}Assets
          </button>
        </div>
      </div>
    </div>
  )
}

export function MediaPickerModal({
  open,
  onOpenChange,
  mode,
  alreadySelected,
  onConfirm,
}: MediaPickerModalProps) {
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const title = 'Pick Assets'

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn(
            'flex max-h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-[24px] p-0',
            'border-0 bg-white/80 shadow-[0px_20px_40px_rgba(26,28,28,0.06)] backdrop-blur-[24px]',
          )}
        >
          <DialogHeader className="px-4 pt-5 pb-1">
            <DialogTitle className="text-base font-semibold text-[#1a1c1c]">
              {title}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {mode === 'include'
                ? 'Select assets to always include in this smart collection.'
                : 'Select assets to always exclude from this smart collection.'}
            </DialogDescription>
          </DialogHeader>
          <PickerContent
            mode={mode}
            alreadySelected={alreadySelected}
            onConfirm={onConfirm}
            onClose={() => onOpenChange(false)}
          />
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          'flex max-h-[90dvh] flex-col rounded-t-[24px] p-0',
          'border-0 bg-white/80 backdrop-blur-[24px]',
        )}
      >
        <SheetHeader className="px-4 pt-5 pb-1">
          <SheetTitle className="text-base font-semibold text-[#1a1c1c]">
            {title}
          </SheetTitle>
          <SheetDescription className="sr-only">
            {mode === 'include'
              ? 'Select assets to always include in this smart collection.'
              : 'Select assets to always exclude from this smart collection.'}
          </SheetDescription>
        </SheetHeader>
        <PickerContent
          mode={mode}
          alreadySelected={alreadySelected}
          onConfirm={onConfirm}
          onClose={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  )
}
