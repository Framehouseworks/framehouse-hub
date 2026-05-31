'use client'

import React from 'react'
import { X, Columns, LayoutGrid, AlignJustify } from 'lucide-react'
import { cn } from '@/utilities/cn'
import type { ChipData, CollectionFilters } from '@/app/(dashboard)/actions/collections'

export type ViewMode = 'masonry' | 'grid' | 'timeline'

interface FilterBarProps {
  chips: ChipData
  activeFilters: CollectionFilters
  viewMode: ViewMode
  onFiltersChange: (filters: CollectionFilters) => void
  onViewModeChange: (mode: ViewMode) => void
}

const TYPE_LABELS: Record<string, string> = { raw: 'RAW', video: 'VIDEO', image: 'IMAGE' }

const VIEW_MODES: { mode: ViewMode; icon: React.ElementType; label: string }[] = [
  { mode: 'masonry', icon: Columns, label: 'Masonry' },
  { mode: 'grid', icon: LayoutGrid, label: 'Grid' },
  { mode: 'timeline', icon: AlignJustify, label: 'Timeline' },
]

export function FilterBar({
  chips,
  activeFilters,
  viewMode,
  onFiltersChange,
  onViewModeChange,
}: FilterBarProps) {
  const hasActiveFilters =
    (activeFilters.types?.length ?? 0) > 0 || !!activeFilters.camera || !!activeFilters.tag

  const toggleType = (type: string) => {
    const current = activeFilters.types ?? []
    const next = current.includes(type) ? current.filter((t) => t !== type) : [...current, type]
    onFiltersChange({ ...activeFilters, types: next.length ? next : undefined })
  }

  const toggleCamera = (camera: string) => {
    onFiltersChange({
      ...activeFilters,
      camera: activeFilters.camera === camera ? undefined : camera,
    })
  }

  const toggleTag = (tag: string) => {
    onFiltersChange({
      ...activeFilters,
      tag: activeFilters.tag === tag ? undefined : tag,
    })
  }

  const clearAll = () => onFiltersChange({})

  const hasChips = chips.types.length > 0 || chips.cameras.length > 0 || chips.tags.length > 0

  if (!hasChips && !hasActiveFilters) {
    return (
      <div className="flex items-center justify-end mb-6">
        <ViewModeToggle viewMode={viewMode} onViewModeChange={onViewModeChange} />
      </div>
    )
  }

  return (
    <div
      className="flex flex-wrap items-center gap-2 mb-6"
      role="group"
      aria-label="Filter by"
    >
      {/* Chip scroll container on mobile */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none flex-1 min-w-0 pb-0.5">
        {/* Clear all */}
        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 px-3 py-1.5 rounded-[16px] bg-tertiary/10 text-tertiary font-rubik text-[10px] font-bold uppercase tracking-wide shrink-0 transition-colors hover:bg-tertiary/20"
          >
            <X size={10} />
            Clear
          </button>
        )}

        {/* Type chips */}
        {chips.types.map((type) => {
          const active = activeFilters.types?.includes(type)
          return (
            <Chip
              key={type}
              label={TYPE_LABELS[type] ?? type.toUpperCase()}
              active={!!active}
              onClick={() => toggleType(type)}
              role="checkbox"
              aria-checked={!!active}
            />
          )
        })}

        {/* Camera chips */}
        {chips.cameras.map((camera) => {
          const active = activeFilters.camera === camera
          return (
            <Chip
              key={camera}
              label={camera}
              active={active}
              onClick={() => toggleCamera(camera)}
              role="checkbox"
              aria-checked={active}
            />
          )
        })}

        {/* Tag chips */}
        {chips.tags.map((tag) => {
          const active = activeFilters.tag === tag
          return (
            <Chip
              key={tag}
              label={tag}
              active={active}
              onClick={() => toggleTag(tag)}
              role="checkbox"
              aria-checked={active}
            />
          )
        })}
      </div>

      {/* View mode toggle — never truncated */}
      <ViewModeToggle viewMode={viewMode} onViewModeChange={onViewModeChange} />
    </div>
  )
}

function Chip({
  label,
  active,
  onClick,
  role,
  'aria-checked': ariaChecked,
}: {
  label: string
  active: boolean
  onClick: () => void
  role?: string
  'aria-checked'?: boolean
}) {
  return (
    <button
      role={role}
      aria-checked={ariaChecked}
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-[16px] font-rubik text-[10px] font-bold uppercase tracking-wide shrink-0 transition-all duration-200 whitespace-nowrap',
        active
          ? 'bg-gallery-gold/15 text-gallery-gold border border-gallery-gold/30'
          : 'bg-black/[0.04] dark:bg-white/[0.06] text-on-surface/50 hover:text-on-surface/80 hover:bg-black/[0.07] dark:hover:bg-white/[0.09] border border-transparent',
      )}
    >
      {label}
    </button>
  )
}

function ViewModeToggle({
  viewMode,
  onViewModeChange,
}: {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
}) {
  return (
    <div
      role="radiogroup"
      aria-label="View mode"
      className="flex items-center gap-0.5 p-1 bg-black/[0.04] dark:bg-white/[0.05] rounded-[16px] shrink-0"
    >
      {VIEW_MODES.map(({ mode, icon: Icon, label }) => (
        <button
          key={mode}
          role="radio"
          aria-checked={viewMode === mode}
          aria-label={label}
          onClick={() => onViewModeChange(mode)}
          className={cn(
            'w-8 h-8 rounded-[12px] flex items-center justify-center transition-all duration-200',
            viewMode === mode
              ? 'bg-gallery-gold/10 text-gallery-gold'
              : 'text-on-surface/35 hover:text-on-surface/70',
          )}
        >
          <Icon size={15} />
        </button>
      ))}
    </div>
  )
}
