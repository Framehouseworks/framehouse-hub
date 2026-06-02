'use client'

import React, { useState, useCallback } from 'react'
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
import { Plus, Trash2, Film, ImageIcon, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Media } from '@/payload-types'
import type { WizardGridItem, WizardState } from '../types'
import { getMediaPreviewUrl, isVideoMedia } from '../types'
import { MasonryGrid } from '@/components/Portfolio/MasonryGrid'
import { AssetPickerSheet } from './AssetPickerSheet'

// Size cycling order
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
      className="relative group aspect-square rounded-xl overflow-hidden bg-gallery-surface"
    >
      {previewUrl ? (
        <img
          src={previewUrl}
          alt={item.media.alt}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          {isVideo ? <Film size={20} className="text-on-surface/30" /> : <ImageIcon size={20} className="text-on-surface/30" />}
        </div>
      )}

      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-1 left-1 w-5 h-5 flex items-center justify-center rounded bg-black/50 text-white/70 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity touch-none"
        aria-label="Drag to reorder"
      >
        <GripVertical size={10} />
      </div>

      {/* Video indicator */}
      {isVideo && (
        <div className="absolute bottom-1 right-6 bg-black/60 rounded px-1 py-0.5">
          <Film size={9} className="text-white" />
        </div>
      )}

      {/* Size badge */}
      <button
        onClick={onCycleSize}
        className="absolute bottom-1 right-1 bg-black/70 text-white font-rubik text-[8px] w-4 h-4 rounded flex items-center justify-center hover:bg-gallery-gold/80 transition-colors"
        aria-label={`Size: ${item.size}. Click to change.`}
        title={`Size: ${item.size}`}
      >
        {SIZE_LABELS[item.size]}
      </button>

      {/* Remove */}
      <button
        onClick={onRemove}
        className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white/80 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#bb1800]/80"
        aria-label={`Remove ${item.media.title}`}
      >
        <Trash2 size={9} />
      </button>
    </div>
  )
}

export function WizardStepAssetTray({ state, onChange }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false)
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
      const newItem: WizardGridItem = {
        instanceId: crypto.randomUUID(),
        media,
        size: 'medium',
      }
      onChange({ items: [...state.items, newItem] })
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

  // Build MasonryGrid-compatible items for live preview
  const previewItems = state.items.map((item) => ({
    id: item.instanceId,
    instanceId: item.instanceId,
    media: item.media,
    size: item.size,
    alt: item.alt,
    caption: item.caption,
    link: item.link,
    instanceTitle: item.instanceTitle,
    focalPoint: item.focalPoint,
    videoThumbnail: item.videoThumbnail
      ? {
          mode: item.videoThumbnail.mode,
          timecodeSeconds: item.videoThumbnail.timecodeSeconds,
          customMedia:
            item.videoThumbnail.customMedia && typeof item.videoThumbnail.customMedia === 'object'
              ? item.videoThumbnail.customMedia
              : null,
        }
      : null,
  }))

  // Type counts
  const typeCounts: Record<string, number> = {}
  for (const item of state.items) {
    const ext = item.media.filename?.split('.').pop()?.toUpperCase() ?? item.media.mediaType.toUpperCase()
    typeCounts[ext] = (typeCounts[ext] ?? 0) + 1
  }

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 w-full">
      {/* Left — tray */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-lg font-semibold tracking-tight text-primary">Curate assets</h2>
            <p className="text-xs text-on-surface/40">Drag to reorder · tap size badge to change</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPickerOpen(true)}
            disabled={state.items.length >= MAX_ASSETS}
            className="gap-1.5 rounded-xl text-gallery-gold hover:text-gallery-gold hover:bg-gallery-gold/10 text-xs"
            aria-label="Open asset picker"
          >
            <Plus size={14} />
            Add assets
          </Button>
        </div>

        {/* Type pills */}
        {state.items.length > 0 && (
          <div className="flex flex-wrap gap-1.5" aria-label="Asset type summary">
            {Object.entries(typeCounts).map(([ext, count]) => (
              <span
                key={ext}
                className="font-rubik text-[9px] tracking-wider bg-on-surface/5 text-on-surface/40 px-2 py-0.5 rounded-sm uppercase"
              >
                {count} {ext}
              </span>
            ))}
            <span className="font-rubik text-[9px] tracking-wider bg-on-surface/5 text-on-surface/40 px-2 py-0.5 rounded-sm uppercase">
              {state.items.length}/{MAX_ASSETS} total
            </span>
          </div>
        )}

        {state.items.length === 0 ? (
          <button
            onClick={() => setPickerOpen(true)}
            className="flex flex-col items-center justify-center gap-3 h-48 rounded-2xl border-2 border-dashed border-on-surface/10 text-on-surface/30 hover:border-gallery-gold/30 hover:text-gallery-gold/60 transition-colors"
            aria-label="Add assets from archive"
          >
            <Plus size={24} />
            <span className="text-sm">Add assets from your archive</span>
          </button>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={state.items.map((i) => i.instanceId)}
              strategy={rectSortingStrategy}
            >
              <div
                className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5"
                role="list"
                aria-label="Portfolio assets, drag to reorder"
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

      {/* Right — live grid preview (desktop) */}
      <div className="hidden lg:flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold tracking-tight text-primary">Grid preview</span>
          <span className="font-rubik text-[9px] text-on-surface/30 tracking-wider uppercase">
            TITAN V3 layout
          </span>
        </div>
        <div className="bg-zinc-950 rounded-2xl overflow-hidden p-4 min-h-48 flex-1">
          {previewItems.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-white/20 text-xs">
              Assets will preview here
            </div>
          ) : (
            <div className="pointer-events-none" aria-hidden="true">
              <MasonryGrid items={previewItems as Parameters<typeof MasonryGrid>[0]['items']} spacing="small" />
            </div>
          )}
        </div>
        <p className="text-[10px] text-on-surface/25 leading-relaxed">
          Order in the tray is fed to the TITAN engine which packs items into rows by weight. Size
          badges affect visual prominence, not pixel position.
        </p>
      </div>

      {/* Asset picker sheet */}
      <AssetPickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        selectedIds={selectedIds}
        onToggle={handleToggleMedia}
      />
    </div>
  )
}
