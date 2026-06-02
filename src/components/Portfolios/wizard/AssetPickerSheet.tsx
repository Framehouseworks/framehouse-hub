'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Search, X, Film, ImageIcon, Loader2 } from 'lucide-react'
import { cn } from '@/utilities/cn'
import { fetchMediaForPickerAction } from '@/app/(dashboard)/actions/portfolios'
import type { Media } from '@/payload-types'
import { getMediaPreviewUrl, isVideoMedia } from '../types'

interface AssetPickerSheetProps {
  open: boolean
  onClose: () => void
  selectedIds: Set<number>
  onToggle: (media: Media) => void
}

export function AssetPickerSheet({ open, onClose, selectedIds, onToggle }: AssetPickerSheetProps) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [docs, setDocs] = useState<Media[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [hasNext, setHasNext] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async (p: number, s: string, t: string) => {
    setLoading(true)
    const result = await fetchMediaForPickerAction({ page: p, search: s || undefined, mediaType: t || undefined })
    if (result.success && result.data) {
      setDocs((prev) => (p === 1 ? result.data!.docs : [...prev, ...result.data!.docs]))
      setHasNext(result.data.hasNextPage)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!open) return
    setPage(1)
    setDocs([])
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => load(1, search, typeFilter), 300)
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current)
    }
  }, [open, search, typeFilter, load])

  function loadMore() {
    const next = page + 1
    setPage(next)
    load(next, search, typeFilter)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className={cn(
          'fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add assets to portfolio"
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 lg:z-auto',
          'lg:relative lg:h-full lg:flex lg:flex-col',
          // Mobile: bottom sheet
          'bg-white dark:bg-zinc-900 rounded-t-[28px] lg:rounded-2xl',
          'shadow-[0px_-24px_64px_rgba(0,0,0,0.18)] lg:shadow-[0px_4px_20px_rgba(26,28,28,0.06)]',
          'max-h-[80vh] lg:max-h-full flex flex-col',
          'transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] lg:transition-none',
          open ? 'translate-y-0' : 'translate-y-full lg:translate-y-0',
        )}
      >
        {/* Handle (mobile only) */}
        <div className="flex justify-center pt-3 pb-1 lg:hidden" aria-hidden="true">
          <div className="w-9 h-1 bg-on-surface/20 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
          <span className="font-rubik text-[9px] tracking-[0.2em] text-on-surface/40 uppercase">
            Add assets
          </span>
          <button
            onClick={onClose}
            aria-label="Close asset picker"
            className="lg:hidden w-7 h-7 flex items-center justify-center rounded-full bg-on-surface/5 text-on-surface/40 active:scale-90 transition-transform"
          >
            <X size={14} />
          </button>
        </div>

        {/* Search + filter */}
        <div className="px-3 pb-2 flex-shrink-0 space-y-2">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface/30" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search archive…"
              className="w-full bg-gallery-surface/60 rounded-xl pl-8 pr-3 py-2 text-[12px] text-primary placeholder:text-on-surface/30 border border-transparent focus:border-gallery-gold/30 focus:outline-none"
              aria-label="Search media"
            />
          </div>
          <div className="flex gap-1">
            {['', 'image', 'video'].map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={cn(
                  'flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-xl transition-colors',
                  typeFilter === t
                    ? 'bg-gallery-gold/15 text-gallery-gold'
                    : 'bg-on-surface/5 text-on-surface/40 hover:text-on-surface/60',
                )}
                aria-pressed={typeFilter === t}
              >
                {t === 'video' && <Film size={10} />}
                {t === 'image' && <ImageIcon size={10} />}
                {t === '' ? 'All' : t}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          {loading && docs.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 size={20} className="animate-spin text-on-surface/30" />
            </div>
          ) : docs.length === 0 ? (
            <p className="text-[11px] text-on-surface/30 text-center py-8">No media found</p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-1.5">
                {docs.map((media) => {
                  const selected = selectedIds.has(media.id)
                  const previewUrl = getMediaPreviewUrl(media)
                  const isVideo = isVideoMedia(media)
                  return (
                    <button
                      key={media.id}
                      onClick={() => onToggle(media)}
                      aria-pressed={selected}
                      aria-label={`${selected ? 'Remove' : 'Add'} ${media.title}`}
                      className={cn(
                        'relative aspect-square rounded-xl overflow-hidden transition-all duration-200',
                        'focus-visible:outline-2 focus-visible:outline-gallery-gold',
                        selected
                          ? 'ring-2 ring-gallery-gold ring-offset-1 scale-95'
                          : 'hover:scale-[0.97]',
                      )}
                    >
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt={media.alt}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-gallery-surface flex items-center justify-center">
                          {isVideo ? (
                            <Film size={20} className="text-on-surface/30" />
                          ) : (
                            <ImageIcon size={20} className="text-on-surface/30" />
                          )}
                        </div>
                      )}
                      {isVideo && (
                        <div className="absolute bottom-1 right-1 bg-black/60 rounded px-1 py-0.5">
                          <Film size={9} className="text-white" />
                        </div>
                      )}
                      {selected && (
                        <div className="absolute inset-0 bg-gallery-gold/30 flex items-center justify-center">
                          <div className="w-5 h-5 rounded-full bg-gallery-gold flex items-center justify-center">
                            <svg viewBox="0 0 10 8" className="w-2.5 fill-white" aria-hidden="true">
                              <path d="M1 4l3 3L9 1" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
              {hasNext && (
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="w-full mt-3 py-2 text-[11px] text-gallery-gold hover:underline disabled:opacity-50"
                >
                  {loading ? 'Loading…' : 'Load more'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
