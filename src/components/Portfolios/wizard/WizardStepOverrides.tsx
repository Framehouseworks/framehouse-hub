'use client'

import React, { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, Pen, Film, ImageIcon, FileText } from 'lucide-react'
// FileText and Film used in OverrideControls fallbacks; Pen for override indicator dot
import { cn } from '@/utilities/cn'
import type { WizardState, WizardGridItem } from '../types'
import { isVideoMedia, isImageMedia, getMediaPreviewUrl, getVideoPreviewUrl, isMediaReady } from '../types' // getVideoPreviewUrl used in OverrideControls
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
  showFocalPoint?: boolean
}

function OverrideControls({ item, onUpdate, showFocalPoint = true }: OverrideControlsProps) {
  const previewUrl = getMediaPreviewUrl(item.media)
  const videoUrl = getVideoPreviewUrl(item.media)
  const ready = isMediaReady(item.media)
  const isVideo = isVideoMedia(item.media)
  const canShowFocalPoint = isImageMedia(item.media) || isVideoMedia(item.media)

  return (
    <div className="flex flex-col gap-5">
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
      {canShowFocalPoint && showFocalPoint && (
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

// Map instanceId → section name for grouped display in the strip (Issue-8)
function buildSectionMap(state: { sectionMode: boolean; sections: { sectionName: string; items: { instanceId: string }[] }[]; items: { instanceId: string }[] }): Map<string, string> {
  const map = new Map<string, string>()
  if (!state.sectionMode) return map
  for (const section of state.sections) {
    for (const item of section.items) {
      map.set(item.instanceId, section.sectionName || 'Section')
    }
  }
  return map
}

export function WizardStepOverrides({ state, onChange }: Props) {
  // In section mode, derive a flat items list from sections for display + navigation
  const allItems: WizardGridItem[] = state.sectionMode && state.sections.length > 0
    ? state.sections.flatMap((s) => s.items)
    : state.items

  // Map instanceId → section label for sticky group headers in the strip
  const sectionMap = buildSectionMap(state as Parameters<typeof buildSectionMap>[0])

  const [activeId, setActiveId] = useState<string | null>(
    allItems[0]?.instanceId ?? null,
  )
  const stripRef = useRef<HTMLDivElement>(null)
  const [narrow, setNarrow] = useState(false)

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

  const activeItem = allItems.find((i) => i.instanceId === activeId) ?? allItems[0] ?? null

  function handleUpdate(patch: Partial<WizardGridItem>) {
    if (!activeId) return
    if (state.sectionMode && state.sections.length > 0) {
      // Update item within the correct section
      const updatedSections = state.sections.map((section) => ({
        ...section,
        items: updateItem(section.items, activeId, patch),
      }))
      onChange({ sections: updatedSections })
    } else {
      onChange({ items: updateItem(state.items, activeId, patch) })
    }
  }

  function scrollToActive(id: string) {
    const el = stripRef.current?.querySelector(`[data-id="${id}"]`) as HTMLElement | null
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }

  function selectItem(id: string) {
    setActiveId(id)
    scrollToActive(id)
  }

  function navigate(dir: -1 | 1) {
    if (!activeId) return
    const idx = allItems.findIndex((i) => i.instanceId === activeId)
    const next = allItems[idx + dir]
    if (next) selectItem(next.instanceId)
  }

  if (allItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <p className="text-sm text-on-surface/40">No assets in your portfolio yet.</p>
        <p className="text-xs text-on-surface/25">Go back to Step 2 to add assets.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Thumbnail strip — sticky so it stays visible while scrolling controls */}
      <div
        className="flex items-center gap-2 sticky top-0 z-10 -mx-1 px-1 py-2 bg-background/95 backdrop-blur-sm rounded-xl"
        style={{ WebkitBackdropFilter: 'blur(12px)' }}
      >
        <button
          onClick={() => navigate(-1)}
          disabled={!activeId || allItems.findIndex((i) => i.instanceId === activeId) === 0}
          className="flex-shrink-0 w-7 h-7 rounded-full bg-on-surface/5 flex items-center justify-center text-on-surface/30 hover:text-primary disabled:opacity-30 transition-colors"
          aria-label="Previous asset"
        >
          <ChevronLeft size={14} />
        </button>

        <div
          ref={stripRef}
          className="flex gap-2 overflow-x-auto scrollbar-hide flex-1 py-2"
          role="list"
          aria-label="Asset strip, click to select"
        >
          {/* Render items with inline section labels between groups */}
          {allItems.map((item, idx) => {
            const isActive = item.instanceId === activeId
            const thumb = getMediaPreviewUrl(item.media)
            const hasOverrides = !!(item.instanceTitle || item.focalPoint || item.videoThumbnail?.mode !== 'auto')
            const sectionLabel = sectionMap.get(item.instanceId)
            const prevSectionLabel = idx > 0 ? sectionMap.get(allItems[idx - 1].instanceId) : null
            const showGroupHeader = state.sectionMode && sectionLabel && sectionLabel !== prevSectionLabel

            return (
              <React.Fragment key={item.instanceId}>
                {showGroupHeader && (
                  <div className="flex-shrink-0 flex items-center self-stretch px-1">
                    <div className="flex flex-col items-center gap-1 h-full justify-center">
                      <div className="w-px flex-1 bg-on-surface/10 min-h-[4px]" />
                      <span
                        className="font-['Rubik_Mono_One',monospace] text-[7px] text-[#7f5700]/60 uppercase tracking-wider whitespace-nowrap"
                        style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                      >
                        {sectionLabel}
                      </span>
                      <div className="w-px flex-1 bg-on-surface/10 min-h-[4px]" />
                    </div>
                  </div>
                )}
              <button
                key={item.instanceId}
                data-id={item.instanceId}
                onClick={() => selectItem(item.instanceId)}
                aria-pressed={isActive}
                aria-label={`Select ${item.instanceTitle ?? item.media.title}`}
                className={cn(
                  'relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden transition-all duration-200',
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
              </React.Fragment>
            )
          })}
        </div>

        <button
          onClick={() => navigate(1)}
          disabled={
            !activeId ||
            allItems.findIndex((i) => i.instanceId === activeId) === allItems.length - 1
          }
          className="flex-shrink-0 w-7 h-7 rounded-full bg-on-surface/5 flex items-center justify-center text-on-surface/30 hover:text-primary disabled:opacity-30 transition-colors"
          aria-label="Next asset"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Controls panel — full content flow, no nested scroll */}
      {!narrow && activeItem && (
        <div className="bg-gallery-surface/40 rounded-2xl p-5">
          {/* Asset identity */}
          <div className="flex items-center gap-2 mb-4">
            <span className="font-rubik text-[9px] tracking-wider bg-on-surface/5 text-on-surface/40 px-1.5 py-0.5 rounded-sm uppercase">
              {activeItem.media.filename?.split('.').pop()?.toUpperCase() ?? activeItem.media.mediaType.toUpperCase()}
            </span>
            <span className="text-xs text-on-surface/30 truncate">
              {activeItem.instanceTitle ?? activeItem.media.title ?? activeItem.media.filename}
            </span>
          </div>
          <OverrideControls item={activeItem} onUpdate={handleUpdate} showFocalPoint />
        </div>
      )}

      {narrow && activeItem && (
        <div className="bg-gallery-surface/40 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="font-rubik text-[9px] tracking-wider bg-on-surface/5 text-on-surface/40 px-1.5 py-0.5 rounded-sm uppercase">
              {activeItem.media.filename?.split('.').pop()?.toUpperCase() ?? activeItem.media.mediaType.toUpperCase()}
            </span>
            <span className="text-xs text-on-surface/30 truncate">
              {activeItem.instanceTitle ?? activeItem.media.title ?? activeItem.media.filename}
            </span>
          </div>
          <OverrideControls item={activeItem} onUpdate={handleUpdate} showFocalPoint />
        </div>
      )}

      {/* Active item breadcrumb */}
      {activeItem && (
        <p className="text-[10px] text-on-surface/25">
          {allItems.findIndex((i) => i.instanceId === activeId) + 1} of {allItems.length} —{' '}
          {activeItem.instanceTitle ?? activeItem.media.title ?? activeItem.media.filename}
        </p>
      )}
    </div>
  )
}
