'use client'

import React, { useState, useCallback, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, Trash2, Film, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Media } from '@/payload-types'
import type { WizardGridItem, WizardState } from '../types'
import { getMediaPreviewUrl, isVideoMedia } from '../types'
import { AssetPickerSheet } from './AssetPickerSheet'

const SIZE_CYCLE: WizardGridItem['size'][] = ['small', 'medium', 'large', 'full']
const SIZE_LABELS = { small: 'S', medium: 'M', large: 'L', full: '■' }
const MAX_ASSETS = 100

interface Props {
  state: WizardState
  onChange: (patch: Partial<WizardState>) => void
}

interface SortableThumbnailProps {
  item: WizardGridItem
  onRemove: () => void
  onCycleSize: () => void
}

function SortableThumbnail({ item, onRemove, onCycleSize }: SortableThumbnailProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.instanceId,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const previewUrl = getMediaPreviewUrl(item.media)
  const isVideo = isVideoMedia(item.media)

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="relative group aspect-square rounded-xl overflow-hidden bg-gallery-surface cursor-grab active:cursor-grabbing touch-none"
      aria-label={`${item.media.title ?? item.media.filename ?? 'Asset'} — drag to reorder`}
    >
      {previewUrl ? (
        <img
          src={previewUrl}
          alt={item.media.alt ?? item.media.title ?? ''}
          className="w-full h-full object-cover pointer-events-none"
          loading="lazy"
          draggable={false}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center pointer-events-none">
          {isVideo
            ? <Film size={20} className="text-on-surface/30" />
            : <ImageIcon size={20} className="text-on-surface/30" />}
        </div>
      )}

      {isVideo && (
        <div className="absolute bottom-1 right-6 bg-black/60 rounded px-1 py-0.5 pointer-events-none">
          <Film size={9} className="text-white" />
        </div>
      )}

      {/* Size badge */}
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onCycleSize() }}
        className="absolute bottom-1 right-1 bg-black/70 text-white font-rubik text-[8px] w-4 h-4 rounded flex items-center justify-center hover:bg-gallery-gold/80 transition-colors pointer-events-auto cursor-pointer"
        aria-label={`Size: ${item.size}. Tap to change.`}
      >
        {SIZE_LABELS[item.size]}
      </button>

      {/* Remove */}
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onRemove() }}
        className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white/80 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#bb1800]/80 pointer-events-auto cursor-pointer"
        aria-label={`Remove ${item.media.title ?? item.media.filename ?? 'asset'}`}
      >
        <Trash2 size={9} />
      </button>
    </div>
  )
}

export function WizardStepAssetTray({ state, onChange }: Props) {
  const [mobilePickerOpen, setMobilePickerOpen] = useState(false)
  // Default true so SSR and desktop first-render show sidebar; mobile corrects on mount
  const [isDesktop, setIsDesktop] = useState(true)

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const selectedIds = new Set(state.items.map((i) => i.media.id))

  function handleToggleMedia(media: Media) {
    if (selectedIds.has(media.id)) {
      onChange({ items: state.items.filter((i) => i.media.id !== media.id) })
    } else {
      if (state.items.length >= MAX_ASSETS) return
      onChange({ items: [...state.items, { instanceId: crypto.randomUUID(), media, size: 'medium' }] })
    }
  }

  function handleRemove(instanceId: string) {
    onChange({ items: state.items.filter((i) => i.instanceId !== instanceId) })
  }

  function handleCycleSize(instanceId: string) {
    onChange({
      items: state.items.map((item) => {
        if (item.instanceId !== instanceId) return item
        const currentIdx = SIZE_CYCLE.indexOf(item.size)
        return { ...item, size: SIZE_CYCLE[(currentIdx + 1) % SIZE_CYCLE.length] }
      }),
    })
  }

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return
      const oldIndex = state.items.findIndex((i) => i.instanceId === active.id)
      const newIndex = state.items.findIndex((i) => i.instanceId === over.id)
      if (oldIndex < 0 || newIndex < 0) return
      const next = [...state.items]
      const [moved] = next.splice(oldIndex, 1)
      next.splice(newIndex, 0, moved)
      onChange({ items: next })
    },
    [state.items, onChange],
  )

  const typeCounts: Record<string, number> = {}
  for (const item of state.items) {
    const ext = item.media.filename?.split('.').pop()?.toUpperCase() ?? item.media.mediaType.toUpperCase()
    typeCounts[ext] = (typeCounts[ext] ?? 0) + 1
  }

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-[1fr_320px] lg:items-stretch gap-6 w-full">
      {/* Left — tray */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-lg font-semibold tracking-tight text-primary">Curate assets</h2>
            <p className="text-xs text-on-surface/40">
              Drag any image to reorder · tap size badge to resize
            </p>
          </div>
          {/* Mobile only — desktop has permanent sidebar */}
          {!isDesktop && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobilePickerOpen(true)}
              disabled={state.items.length >= MAX_ASSETS}
              className="gap-1.5 rounded-xl text-gallery-gold hover:text-gallery-gold hover:bg-gallery-gold/10 text-xs"
            >
              <Plus size={14} />
              Add
            </Button>
          )}
        </div>

        {state.items.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(typeCounts).map(([ext, count]) => (
              <span key={ext} className="font-rubik text-[9px] tracking-wider bg-on-surface/5 text-on-surface/40 px-2 py-0.5 rounded-sm uppercase">
                {count} {ext}
              </span>
            ))}
            <span className="font-rubik text-[9px] tracking-wider bg-on-surface/5 text-on-surface/40 px-2 py-0.5 rounded-sm uppercase">
              {state.items.length}/{MAX_ASSETS}
            </span>
          </div>
        )}

        {state.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 h-48 rounded-2xl border-2 border-dashed border-on-surface/10 text-on-surface/25">
            <Plus size={24} />
            <span className="text-sm">Select assets from the archive →</span>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={state.items.map((i) => i.instanceId)} strategy={rectSortingStrategy}>
              <div
                className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-4 gap-1.5"
                role="list"
                aria-label="Portfolio assets — drag to reorder"
              >
                {state.items.map((item) => (
                  <div key={item.instanceId} role="listitem">
                    <SortableThumbnail
                      item={item}
                      onRemove={() => handleRemove(item.instanceId)}
                      onCycleSize={() => handleCycleSize(item.instanceId)}
                    />
                  </div>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Right — archive picker:
           Desktop: permanent sidebar (open=true always)
           Mobile: bottom sheet triggered by button above */}
      {isDesktop ? (
        <div className="flex flex-col rounded-2xl overflow-hidden border border-on-surface/8 bg-white dark:bg-zinc-900 min-h-[320px]">
          <div className="px-4 pt-3 pb-1 flex-shrink-0 border-b border-on-surface/8">
            <span className="font-rubik text-[9px] tracking-[0.2em] text-on-surface/40 uppercase">Archive</span>
          </div>
          <AssetPickerSheet
            open={true}
            onClose={() => {}}
            selectedIds={selectedIds}
            onToggle={handleToggleMedia}
            inline
          />
        </div>
      ) : (
        <AssetPickerSheet
          open={mobilePickerOpen}
          onClose={() => setMobilePickerOpen(false)}
          selectedIds={selectedIds}
          onToggle={handleToggleMedia}
        />
      )}
    </div>
  )
}
