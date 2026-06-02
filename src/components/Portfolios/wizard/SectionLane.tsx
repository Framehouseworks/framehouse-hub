'use client'

import React, { useState } from 'react'
import {
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Film, ImageIcon, GripVertical, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/utilities/cn'
import type { WizardSection, WizardGridItem, SectionLayoutStyle, SectionWidth } from '../types'
import { getMediaPreviewUrl, isVideoMedia } from '../types'
import { SectionLaneHeader } from './SectionLaneHeader'

// Enterprise: cap visible items in builder lane to prevent DOM explosion (Issue 6)
const MAX_VISIBLE_ITEMS = 50

interface SortableAssetCardProps {
  item: WizardGridItem
  onRemove: () => void
  isOver?: boolean
}

function SortableAssetCard({ item, onRemove, isOver }: SortableAssetCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.instanceId,
    data: { type: 'item', item },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const previewUrl = getMediaPreviewUrl(item.media)
  const isVideo = isVideoMedia(item.media)

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'relative group flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-gallery-surface transition-all cursor-grab active:cursor-grabbing touch-none',
        isOver && 'ring-2 ring-[#7f5700]',
      )}
      aria-label="Drag to reorder"
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
          {isVideo ? (
            <Film size={16} className="text-on-surface/30" aria-hidden="true" />
          ) : (
            <ImageIcon size={16} className="text-on-surface/30" aria-hidden="true" />
          )}
        </div>
      )}

      {/* Grip hint — decorative, drag is active on entire card */}
      <div
        className="absolute top-0.5 left-0.5 w-5 h-5 flex items-center justify-center rounded bg-black/40 text-white/50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        aria-hidden="true"
      >
        <GripVertical size={10} />
      </div>

      {/* Video badge */}
      {isVideo && (
        <div className="absolute bottom-0.5 right-5 bg-black/60 rounded px-0.5" aria-hidden="true">
          <Film size={8} className="text-white" />
        </div>
      )}

      {/* Remove — stops propagation so click doesn't trigger drag */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onRemove() }}
        className="absolute top-0 right-0 w-8 h-8 bg-black/60 rounded-bl-xl rounded-tr-xl flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-[#bb1800]/80 pointer-events-auto cursor-pointer"
        aria-label={`Remove ${item.media.title ?? item.media.filename ?? 'asset'} from section`}
      >
        <Trash2 size={10} className="text-white" aria-hidden="true" />
      </button>
    </div>
  )
}

interface SectionLaneProps {
  section: WizardSection
  index: number
  total: number
  isMobile: boolean
  isSaving: boolean
  totalAssets: number
  maxAssets: number
  overItemId?: string | null
  onUpdate: (patch: Partial<WizardSection>) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onOpenPicker: () => void
}

export function SectionLane({
  section,
  index,
  total,
  isMobile,
  isSaving,
  totalAssets,
  maxAssets,
  overItemId,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onOpenPicker,
}: SectionLaneProps) {
  // useSortable for the section itself (section-level DnD)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
    data: { type: 'section' },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  }

  // Portrait warning: >50% of images are portrait
  const hasPortraitWarning =
    section.items.length > 0 &&
    section.items.filter((item) => {
      const m = item.media
      return (m.height ?? 0) > (m.width ?? 1)
    }).length /
      section.items.length >
      0.5

  function handleRename(name: string) {
    onUpdate({ sectionName: name })
  }

  function handleLayoutChange(style: SectionLayoutStyle) {
    onUpdate({ layoutStyle: style })
  }

  function handleRemoveItem(instanceId: string) {
    onUpdate({ items: section.items.filter((i) => i.instanceId !== instanceId) })
  }

  // Drag handle props for the section header (cast to permissive type for SectionLaneHeader)
  const dragHandleProps = { ...attributes, ...(listeners ?? {}) } as Record<string, unknown>

  const [confirmDelete, setConfirmDelete] = useState(false)

  function handleDeleteRequest() {
    if (section.items.length === 0) {
      onDelete()
    } else {
      setConfirmDelete(true)
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex flex-col gap-3 rounded-2xl bg-gallery-surface/30 border border-on-surface/5 p-4 transition-all',
        isDragging && 'shadow-2xl',
      )}
    >
      <SectionLaneHeader
        section={section}
        index={index}
        total={total}
        hasPortraitWarning={hasPortraitWarning}
        isMobile={isMobile}
        isSaving={isSaving}
        onRename={handleRename}
        onLayoutChange={handleLayoutChange}
        onTrackHeightChange={(h) => onUpdate({ filmstripTrackHeight: h })}
        onColumnsChange={(c) => onUpdate({ uniformGridColumns: c })}
        onToggleHeader={() => onUpdate({ showSectionHeader: !section.showSectionHeader })}
        onTogglePreserveAspectRatio={() => onUpdate({ preserveAspectRatio: !section.preserveAspectRatio })}
        onWidthChange={(w: SectionWidth) => onUpdate({ sectionWidth: w })}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onDelete={handleDeleteRequest}
        dragHandleProps={dragHandleProps}
      />

      {/* Delete confirmation */}
      {confirmDelete && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-label="Confirm section deletion"
          className="flex flex-col gap-2 bg-on-surface/5 rounded-xl p-3"
        >
          <p className="text-xs text-on-surface/70">
            Delete &ldquo;{section.sectionName || 'this section'}&rdquo;?{' '}
            {section.items.length} asset{section.items.length !== 1 ? 's' : ''} will be moved to the
            first remaining section.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="flex-1 py-1.5 rounded-xl bg-on-surface/5 text-xs text-on-surface/60 hover:text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => { setConfirmDelete(false); onDelete() }}
              className="flex-1 py-1.5 rounded-xl bg-[#bb1800]/10 text-[#bb1800] text-xs font-medium hover:bg-[#bb1800]/20 transition-colors"
            >
              Delete &amp; Move
            </button>
          </div>
        </div>
      )}

      {/* Asset lane — capped at MAX_VISIBLE_ITEMS to prevent DOM explosion (Issue 6) */}
      <SortableContext items={section.items.map((i) => i.instanceId)} strategy={horizontalListSortingStrategy}>
        {section.items.length === 0 ? (
          <div
            className="flex items-center justify-center h-16 rounded-xl border-2 border-dashed border-on-surface/10 text-on-surface/25 text-xs"
            aria-label="Empty section — hidden from clients"
          >
            Drag assets here — hidden from clients until populated
          </div>
        ) : (
          <div
            className="flex gap-2 overflow-x-auto pb-1 min-h-[64px]"
            role="list"
            aria-label={`Assets in ${section.sectionName || 'this section'}`}
          >
            {section.items.slice(0, MAX_VISIBLE_ITEMS).map((item) => (
              <div key={item.instanceId} role="listitem">
                <SortableAssetCard
                  item={item}
                  onRemove={() => handleRemoveItem(item.instanceId)}
                  isOver={overItemId === item.instanceId}
                />
              </div>
            ))}
            {section.items.length > MAX_VISIBLE_ITEMS && (
              <div
                className="flex-shrink-0 w-16 h-16 rounded-xl bg-on-surface/5 flex items-center justify-center text-[9px] text-on-surface/30 font-medium"
                aria-label={`${section.items.length - MAX_VISIBLE_ITEMS} more assets not shown`}
              >
                +{section.items.length - MAX_VISIBLE_ITEMS}
              </div>
            )}
          </div>
        )}
      </SortableContext>

      {/* Add assets button */}
      <button
        type="button"
        onClick={onOpenPicker}
        disabled={totalAssets >= maxAssets}
        className="flex items-center gap-1.5 self-start text-[11px] text-[#7f5700] hover:text-[#a06a00] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label={
          totalAssets >= maxAssets
            ? 'Asset limit reached (100)'
            : `Add assets to ${section.sectionName || 'this section'}`
        }
      >
        <Plus size={12} aria-hidden="true" />
        Add assets
        {totalAssets >= maxAssets && (
          <span className="text-on-surface/30">(limit reached)</span>
        )}
      </button>
    </div>
  )
}
