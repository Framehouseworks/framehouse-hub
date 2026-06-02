'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/utilities/cn'
import type { Media } from '@/payload-types'
import type {
  WizardState,
  WizardGridItem,
  WizardSection,
} from '../types'
import { autoParseSections } from '../types'
import { AutoParseBar } from './AutoParseBar'
import { SectionLane } from './SectionLane'
import { AssetPickerSheet } from './AssetPickerSheet'

const MAX_ASSETS = 100

interface Props {
  state: WizardState
  onChange: (patch: Partial<WizardState>) => void
}

function totalAssets(sections: WizardSection[]): number {
  return sections.reduce((sum, s) => sum + s.items.length, 0)
}

function newSection(): WizardSection {
  return {
    id: `new-${crypto.randomUUID()}`,
    sectionName: '',
    showSectionHeader: false,
    layoutStyle: 'masonry',
    filmstripTrackHeight: 'comfortable',
    uniformGridColumns: '3',
    preserveAspectRatio: false,
    sectionWidth: 'full',
    items: [],
  }
}

export function WizardStepSectionLayout({ state, onChange }: Props) {
  const [autoParseRan, setAutoParseRan] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  // Which section's picker is open (-1 = none)
  const [pickerSectionIdx, setPickerSectionIdx] = useState(-1)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [overItemId, setOverItemId] = useState<string | null>(null)
  // Store which section an active item belongs to (for cross-section DnD)
  const activeSectionIdxRef = useRef<number>(-1)

  const sections = state.sections

  // Mobile breakpoint detection
  useEffect(() => {
    function check() { setIsMobile(window.innerWidth < 640) }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Auto-parse on first mount (C-5 / Journey 3)
  useEffect(() => {
    if (!state.sectionMode || sections.length === 0) {
      const parsed = autoParseSections(state.items)
      onChange({ sections: parsed, sectionMode: true })
      if (parsed.length > 1 || (parsed.length === 1 && parsed[0].sectionName !== 'All Assets')) {
        setAutoParseRan(true)
      }
    }
  // Only run on initial mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function updateSection(idx: number, patch: Partial<WizardSection>) {
    const next = sections.map((s, i) => (i === idx ? { ...s, ...patch } : s))
    onChange({ sections: next })
  }

  function handleDeleteSection(idx: number) {
    if (sections.length <= 1) return
    // Move orphaned items to first remaining section
    const deleted = sections[idx]
    const remaining = sections.filter((_, i) => i !== idx)
    if (deleted.items.length > 0 && remaining.length > 0) {
      remaining[0] = { ...remaining[0], items: [...remaining[0].items, ...deleted.items] }
    }
    onChange({ sections: remaining })
    toast.success(`Section deleted. Assets moved to "${remaining[0].sectionName || 'first section'}"`)
  }

  function handleMoveSection(idx: number, dir: -1 | 1) {
    const target = idx + dir
    if (target < 0 || target >= sections.length) return
    const next = [...sections]
    ;[next[idx], next[target]] = [next[target], next[idx]]
    onChange({ sections: next })
  }

  function handleAddSection() {
    onChange({ sections: [...sections, newSection()] })
  }

  function handleUndo() {
    const allItems = sections.flatMap((s) => s.items)
    onChange({
      sections: [
        {
          id: `new-${crypto.randomUUID()}`,
          sectionName: 'All Assets',
          showSectionHeader: false,
          layoutStyle: 'masonry',
          filmstripTrackHeight: 'comfortable',
          uniformGridColumns: '3',
          preserveAspectRatio: false,
          sectionWidth: 'full',
          items: allItems,
        },
      ],
    })
    setAutoParseRan(false)
  }

  // ── Picker logic ────────────────────────────────────────────────────────────

  // All media IDs already assigned to any section
  const selectedIds = new Set(sections.flatMap((s) => s.items.map((i) => i.media.id)))

  function handlePickerToggle(media: Media) {
    if (pickerSectionIdx < 0) return
    const section = sections[pickerSectionIdx]
    if (!section) return
    const already = section.items.some((i) => i.media.id === media.id)
    if (already) {
      // Remove from this section
      updateSection(pickerSectionIdx, {
        items: section.items.filter((i) => i.media.id !== media.id),
      })
    } else {
      if (totalAssets(sections) >= MAX_ASSETS) {
        toast.error('Portfolio limit reached (100 assets). Remove an asset to add another.')
        return
      }
      const newItem: WizardGridItem = {
        instanceId: crypto.randomUUID(),
        media,
        size: 'medium',
      }
      updateSection(pickerSectionIdx, { items: [...section.items, newItem] })
    }
  }

  // ── DnD sensors ─────────────────────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      setActiveDragId(String(event.active.id))
      const activeType = (event.active.data.current as { type?: string } | undefined)?.type
      if (activeType === 'item') {
        // Find which section this item belongs to
        const idx = sections.findIndex((s) => s.items.some((i) => i.instanceId === event.active.id))
        activeSectionIdxRef.current = idx
      }
    },
    [sections],
  )

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event
      if (!over) { setOverItemId(null); return }
      const activeType = (active.data.current as { type?: string } | undefined)?.type
      if (activeType === 'item') {
        setOverItemId(String(over.id))
      }
    },
    [],
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      setActiveDragId(null)
      setOverItemId(null)

      if (!over || active.id === over.id) return

      const activeType = (active.data.current as { type?: string } | undefined)?.type
      const overType = (over.data.current as { type?: string } | undefined)?.type

      if (activeType === 'section') {
        // Section reorder
        const oldIdx = sections.findIndex((s) => s.id === active.id)
        const newIdx = sections.findIndex((s) => s.id === over.id)
        if (oldIdx < 0 || newIdx < 0 || oldIdx === newIdx) return
        onChange({ sections: arrayMove(sections, oldIdx, newIdx) })
        return
      }

      if (activeType === 'item') {
        // Find source section
        const srcIdx = sections.findIndex((s) => s.items.some((i) => i.instanceId === active.id))
        if (srcIdx < 0) return

        // Find target — could be an item (over item in any section) or a section header
        let dstIdx = -1
        let dstItemIdx = -1

        if (overType === 'section') {
          // Dropped on section header → append to that section
          dstIdx = sections.findIndex((s) => s.id === over.id)
        } else {
          // Over an item — find which section contains it
          for (let i = 0; i < sections.length; i++) {
            const itemIdx = sections[i].items.findIndex((item) => item.instanceId === over.id)
            if (itemIdx >= 0) { dstIdx = i; dstItemIdx = itemIdx; break }
          }
        }

        if (dstIdx < 0) return

        const next = sections.map((s) => ({ ...s, items: [...s.items] }))

        if (srcIdx === dstIdx) {
          // Same section — reorder
          const srcItemIdx = next[srcIdx].items.findIndex((i) => i.instanceId === active.id)
          if (srcItemIdx < 0 || dstItemIdx < 0 || srcItemIdx === dstItemIdx) return
          next[srcIdx].items = arrayMove(next[srcIdx].items, srcItemIdx, dstItemIdx)
        } else {
          // Cross-section move
          const srcItemIdx = next[srcIdx].items.findIndex((i) => i.instanceId === active.id)
          if (srcItemIdx < 0) return
          const [moved] = next[srcIdx].items.splice(srcItemIdx, 1)
          if (dstItemIdx >= 0) {
            next[dstIdx].items.splice(dstItemIdx, 0, moved)
          } else {
            next[dstIdx].items.push(moved)
          }
        }

        onChange({ sections: next })
      }
    },
    [sections, onChange],
  )

  if (sections.length === 0) return null

  const total = totalAssets(sections)

  return (
    <div className="flex flex-col gap-0 w-full">
      {/* Auto-parse notification */}
      {autoParseRan && <AutoParseBar sectionCount={sections.length} onUndo={handleUndo} />}

      <div className={cn('flex flex-col gap-4 md:gap-6 w-full min-w-0', 'xl:grid xl:grid-cols-[1fr_400px] 2xl:grid-cols-[1fr_520px] xl:items-start')}>
        {/* ── Section builder canvas ── */}
        <div className="flex flex-col gap-3 min-w-0 flex-1">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-primary">Section layout</h2>
              <p className="text-xs text-on-surface/40">
                Organise assets into sections · set layout style · drag to reorder
              </p>
            </div>
            {/* Re-trigger auto-parse (Issue-18) */}
            <button
              type="button"
              onClick={() => {
                const allItems = sections.flatMap((s) => s.items)
                const parsed = autoParseSections(allItems)
                onChange({ sections: parsed })
                setAutoParseRan(true)
              }}
              className="text-[10px] text-on-surface/30 hover:text-[#7f5700] transition-colors px-2 py-1 rounded-lg hover:bg-on-surface/5"
              aria-label="Re-organise sections by asset type"
            >
              Auto-organise
            </button>
            <span
              className="font-['Rubik_Mono_One',monospace] text-[9px] text-on-surface/30 bg-on-surface/5 px-2 py-0.5 rounded-full"
              aria-label={`${total} of ${MAX_ASSETS} assets used`}
            >
              {total}/{MAX_ASSETS}
            </span>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              <div
                className="flex flex-col gap-3"
                role="list"
                aria-label="Portfolio sections"
              >
                {sections.map((section, idx) => (
                  <div key={section.id} role="listitem">
                    <SectionLane
                      section={section}
                      index={idx}
                      total={sections.length}
                      isMobile={isMobile}
                      totalAssets={total}
                      maxAssets={MAX_ASSETS}
                      overItemId={overItemId}
                      onUpdate={(patch) => updateSection(idx, patch)}
                      onDelete={() => handleDeleteSection(idx)}
                      onMoveUp={() => handleMoveSection(idx, -1)}
                      onMoveDown={() => handleMoveSection(idx, 1)}
                      onOpenPicker={() => setPickerSectionIdx(idx)}
                    />
                  </div>
                ))}
              </div>
            </SortableContext>

            <DragOverlay>
              {activeDragId && (
                <div className="w-16 h-16 rounded-xl bg-[#7f5700]/20 border-2 border-[#7f5700]/60 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-[#7f5700]" />
                </div>
              )}
            </DragOverlay>
          </DndContext>

          {/* Add section */}
          <button
            type="button"
            onClick={handleAddSection}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border-2 border-dashed border-on-surface/10 text-on-surface/30 hover:border-[#7f5700]/30 hover:text-[#7f5700]/60 transition-colors text-sm"
            aria-label="Add a new section"
          >
            <Plus size={16} aria-hidden="true" />
            Add section
          </button>
        </div>

        {/* ── Live preview pane (desktop ≥1280px) — sticky, fills right column ── */}
        <div className="hidden xl:flex flex-col gap-3 sticky top-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-primary">Preview</span>
            <span className="font-['Rubik_Mono_One',monospace] text-[9px] text-on-surface/30 tracking-wider uppercase">
              {sections.length} section{sections.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div
            className="bg-zinc-950 rounded-2xl overflow-y-auto p-4 max-h-[calc(100vh-220px)]"
            aria-hidden="true"
          >
            <div className="flex flex-col gap-4">
              {sections.map((section, idx) => (
                <div key={section.id} className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-['Rubik_Mono_One',monospace] text-[8px] text-[#7f5700]/70 uppercase tracking-wider truncate">
                      {section.sectionName || `Section ${idx + 1}`}
                    </span>
                    <span className="text-[8px] text-on-surface/30 bg-on-surface/5 px-1.5 py-0.5 rounded">
                      {section.layoutStyle === 'filmstrip' ? 'Film' : section.layoutStyle === 'uniform_grid' ? 'Grid' : 'Auto'}
                    </span>
                    <span className="text-[8px] text-on-surface/20 ml-auto">{section.items.length} assets</span>
                  </div>
                  {/* Larger thumbnails in preview */}
                  <div className="flex gap-1 overflow-hidden flex-wrap">
                    {section.items.slice(0, 12).map((item) => {
                      const src = item.media.thumbnailUrl ?? item.media.proxyUrl ?? item.media.originalUrl ?? item.media.url ?? undefined
                      return src ? (
                        <img key={item.instanceId} src={src} alt="" className="h-12 w-12 flex-shrink-0 object-cover rounded-lg" />
                      ) : (
                        <div key={item.instanceId} className="h-12 w-12 flex-shrink-0 rounded-lg bg-on-surface/5" />
                      )
                    })}
                    {section.items.length > 12 && (
                      <div className="h-12 w-12 flex-shrink-0 rounded-lg bg-on-surface/10 flex items-center justify-center text-[8px] text-on-surface/40 font-medium">
                        +{section.items.length - 12}
                      </div>
                    )}
                    {section.items.length === 0 && (
                      <div className="h-12 flex-1 rounded-lg bg-on-surface/5 flex items-center justify-center text-[8px] text-on-surface/25">
                        empty — hidden from clients
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Asset picker sheet */}
      {pickerSectionIdx >= 0 && (
        <AssetPickerSheet
          open={pickerSectionIdx >= 0}
          onClose={() => setPickerSectionIdx(-1)}
          selectedIds={selectedIds}
          onToggle={handlePickerToggle}
        />
      )}
    </div>
  )
}
