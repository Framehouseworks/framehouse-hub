'use client'

import React, { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, Pen, Film, ImageIcon, FileText } from 'lucide-react'
import { cn } from '@/utilities/cn'
import type { WizardState, WizardGridItem } from '../types'
import { isVideoMedia, isImageMedia, getMediaPreviewUrl, getVideoPreviewUrl, isMediaReady } from '../types'
import { FocalPointCanvas } from './FocalPointCanvas'
import { VideoThumbnailControls } from './VideoThumbnailControls'

interface Props {
  state: WizardState
  onChange: (patch: Partial<WizardState>) => void
}

function updateItem(items: WizardGridItem[], instanceId: string, patch: Partial<WizardGridItem>): WizardGridItem[] {
  return items.map((item) => (item.instanceId === instanceId ? { ...item, ...patch } : item))
}

interface OverrideControlsProps {
  item: WizardGridItem
  onUpdate: (patch: Partial<WizardGridItem>) => void
}

function OverrideControls({ item, onUpdate }: OverrideControlsProps) {
  const previewUrl = getMediaPreviewUrl(item.media)
  const videoUrl = getVideoPreviewUrl(item.media)
  const ready = isMediaReady(item.media)
  const isVideo = isVideoMedia(item.media)
  const canShowFocalPoint = isImageMedia(item.media) || isVideoMedia(item.media)

  return (
    <div className="flex flex-col gap-5 overflow-y-auto">
      {/* Display Name */}
      <div>
        <label
          htmlFor="override-display-name"
          className="font-rubik text-[9px] tracking-[0.2em] text-on-surface/40 uppercase block mb-1.5"
        >
          Display name
        </label>
        <input
          id="override-display-name"
          type="text"
          value={item.instanceTitle ?? ''}
          onChange={(e) => onUpdate({ instanceTitle: e.target.value || null })}
          placeholder={item.media.title || item.media.filename || 'Original name'}
          className="w-full bg-gallery-surface/60 rounded-xl px-3 py-2 text-sm text-primary placeholder:text-on-surface/30 border border-transparent focus:border-gallery-gold/40 focus:outline-none"
          aria-label="Client-facing display name for this asset in this portfolio"
        />
        <p className="text-[10px] text-on-surface/25 mt-1">
          Shown to client. Master archive is unchanged.
        </p>
      </div>

      {/* Focal point */}
      {canShowFocalPoint && (
        <div>
          <p className="font-rubik text-[9px] tracking-[0.2em] text-on-surface/40 uppercase mb-2">
            Focal point
          </p>
          {!ready ? (
            <p className="text-xs text-on-surface/30 bg-on-surface/5 rounded-xl px-3 py-2.5">
              Processing… Focal point available after worker completes.
            </p>
          ) : previewUrl ? (
            <FocalPointCanvas
              imageUrl={previewUrl}
              focalPoint={item.focalPoint ?? { x: 50, y: 50 }}
              onChange={(fp) => onUpdate({ focalPoint: fp })}
            />
          ) : (
            <p className="text-xs text-on-surface/30">No preview available.</p>
          )}
        </div>
      )}

      {/* Video thumbnail */}
      {isVideo && (
        <VideoThumbnailControls
          value={item.videoThumbnail ?? { mode: 'auto' }}
          onChange={(vt) => onUpdate({ videoThumbnail: vt })}
          proxyVideoUrl={ready ? videoUrl : null}
          thumbnailUrl={ready ? item.media.thumbnailUrl ?? null : null}
        />
      )}
    </div>
  )
}

export function WizardStepOverrides({ state, onChange }: Props) {
  const [activeId, setActiveId] = useState<string | null>(
    state.items[0]?.instanceId ?? null,
  )
  const stripRef = useRef<HTMLDivElement>(null)
  // Track if we're on a narrow viewport for the drawer layout
  const [narrow, setNarrow] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    function check() {
      // Content area width: viewport - sidebar (280px on lg+) - padding (64px)
      const contentWidth = window.innerWidth >= 1024 ? window.innerWidth - 280 - 64 : window.innerWidth - 32
      setNarrow(contentWidth < 1280)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const activeItem = state.items.find((i) => i.instanceId === activeId) ?? state.items[0] ?? null

  function handleUpdate(patch: Partial<WizardGridItem>) {
    if (!activeId) return
    onChange({ items: updateItem(state.items, activeId, patch) })
  }

  function scrollToActive(id: string) {
    const el = stripRef.current?.querySelector(`[data-id="${id}"]`) as HTMLElement | null
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }

  function selectItem(id: string) {
    setActiveId(id)
    scrollToActive(id)
    if (narrow) setDrawerOpen(true)
  }

  function navigate(dir: -1 | 1) {
    if (!activeId) return
    const idx = state.items.findIndex((i) => i.instanceId === activeId)
    const next = state.items[idx + dir]
    if (next) selectItem(next.instanceId)
  }

  if (state.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <p className="text-sm text-on-surface/40">No assets in your portfolio yet.</p>
        <p className="text-xs text-on-surface/25">Go back to Step 2 to add assets.</p>
      </div>
    )
  }

  const previewUrl = activeItem ? getMediaPreviewUrl(activeItem.media) : null

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Thumbnail strip */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          disabled={!activeId || state.items.findIndex((i) => i.instanceId === activeId) === 0}
          className="flex-shrink-0 w-7 h-7 rounded-full bg-on-surface/5 flex items-center justify-center text-on-surface/30 hover:text-primary disabled:opacity-30 transition-colors"
          aria-label="Previous asset"
        >
          <ChevronLeft size={14} />
        </button>

        <div
          ref={stripRef}
          className="flex gap-2 overflow-x-auto scrollbar-hide flex-1"
          role="list"
          aria-label="Asset strip, click to select"
        >
          {state.items.map((item) => {
            const isActive = item.instanceId === activeId
            const thumb = getMediaPreviewUrl(item.media)
            const hasOverrides = !!(item.instanceTitle || item.focalPoint || item.videoThumbnail?.mode !== 'auto')

            return (
              <button
                key={item.instanceId}
                data-id={item.instanceId}
                onClick={() => selectItem(item.instanceId)}
                aria-pressed={isActive}
                aria-label={`Select ${item.instanceTitle ?? item.media.title}`}
                className={cn(
                  'relative flex-shrink-0 w-12 h-12 rounded-xl overflow-hidden transition-all duration-200',
                  isActive
                    ? 'ring-2 ring-gallery-gold ring-offset-1 scale-105'
                    : 'opacity-60 hover:opacity-90',
                )}
              >
                {thumb ? (
                  <img src={thumb} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full bg-gallery-surface flex items-center justify-center">
                    {isVideoMedia(item.media) ? (
                      <Film size={14} className="text-on-surface/30" />
                    ) : isImageMedia(item.media) ? (
                      <ImageIcon size={14} className="text-on-surface/30" />
                    ) : (
                      <FileText size={14} className="text-on-surface/30" />
                    )}
                  </div>
                )}
                {hasOverrides && (
                  <div className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full bg-gallery-gold flex items-center justify-center" aria-hidden="true">
                    <Pen size={7} className="text-white" />
                  </div>
                )}
              </button>
            )
          })}
        </div>

        <button
          onClick={() => navigate(1)}
          disabled={
            !activeId ||
            state.items.findIndex((i) => i.instanceId === activeId) === state.items.length - 1
          }
          className="flex-shrink-0 w-7 h-7 rounded-full bg-on-surface/5 flex items-center justify-center text-on-surface/30 hover:text-primary disabled:opacity-30 transition-colors"
          aria-label="Next asset"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Wide layout: canvas + controls side by side */}
      {!narrow && activeItem && (
        <div className="grid grid-cols-[1fr_320px] gap-6">
          {/* Canvas */}
          <div className="flex flex-col gap-3">
            {isImageMedia(activeItem.media) && previewUrl && isMediaReady(activeItem.media) ? (
              <FocalPointCanvas
                imageUrl={previewUrl}
                focalPoint={activeItem.focalPoint ?? { x: 50, y: 50 }}
                onChange={(fp) => handleUpdate({ focalPoint: fp })}
              />
            ) : isVideoMedia(activeItem.media) ? (
              <div className="relative w-full bg-zinc-950 rounded-2xl overflow-hidden aspect-video flex items-center justify-center">
                {previewUrl ? (
                  <img src={previewUrl} alt="Video thumbnail preview" className="w-full h-full object-contain" />
                ) : (
                  <Film size={32} className="text-white/20" />
                )}
              </div>
            ) : (
              <div className="w-full aspect-video rounded-2xl bg-gallery-surface flex items-center justify-center">
                <FileText size={32} className="text-on-surface/20" />
              </div>
            )}

            {/* Asset info */}
            <div className="flex items-center gap-2">
              <span className="font-rubik text-[9px] tracking-wider bg-on-surface/5 text-on-surface/40 px-1.5 py-0.5 rounded-sm uppercase">
                {activeItem.media.filename?.split('.').pop()?.toUpperCase() ?? activeItem.media.mediaType.toUpperCase()}
              </span>
              <span className="text-xs text-on-surface/30 truncate">
                {activeItem.instanceTitle ?? activeItem.media.title ?? activeItem.media.filename}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-gallery-surface/40 rounded-2xl p-4">
            {activeItem && <OverrideControls item={activeItem} onUpdate={handleUpdate} />}
          </div>
        </div>
      )}

      {/* Narrow layout: full-width canvas + floating drawer button */}
      {narrow && activeItem && (
        <div className="flex flex-col gap-3">
          {/* Canvas or preview */}
          <div className="relative w-full bg-zinc-950 rounded-2xl overflow-hidden" style={{ aspectRatio: '4/3' }}>
            {previewUrl ? (
              <img src={previewUrl} alt="Asset preview" className="w-full h-full object-contain" />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Film size={32} className="text-white/20" />
              </div>
            )}

            {/* Floating edit button */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm text-primary px-3 py-2 rounded-full text-xs font-medium shadow-lg"
              aria-label="Edit asset overrides"
              aria-expanded={drawerOpen}
            >
              <Pen size={12} />
              Edit asset
            </button>
          </div>

          {/* Inline controls on narrow (no drawer needed at step 3, inline is fine on narrow) */}
          <div className="bg-gallery-surface/40 rounded-2xl p-4">
            <OverrideControls item={activeItem} onUpdate={handleUpdate} />
          </div>
        </div>
      )}

      {/* Active item breadcrumb */}
      {activeItem && (
        <p className="text-[10px] text-on-surface/25">
          {state.items.findIndex((i) => i.instanceId === activeId) + 1} of {state.items.length} —{' '}
          {activeItem.instanceTitle ?? activeItem.media.title ?? activeItem.media.filename}
        </p>
      )}
    </div>
  )
}
