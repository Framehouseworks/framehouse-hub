'use client'

import React, { useState } from 'react'
import { CheckSquare, MinusSquare, Square } from 'lucide-react'
import { cn } from '@/utilities/cn'
import type { DateMode } from '@/lib/groupMedia'

interface GroupHeaderProps {
  label: string
  labelType: 'date' | 'shoot'
  count: number
  dateMode: DateMode
  isFirst?: boolean
  groupItemIds: (string | number)[]
  selectedIds: Set<string | number>
  isSelectionMode: boolean
  onSelectGroup: (ids: (string | number)[], allSelected: boolean) => void
}

export const GroupHeader: React.FC<GroupHeaderProps> = ({
  label,
  labelType,
  count,
  dateMode,
  isFirst,
  groupItemIds,
  selectedIds,
  isSelectionMode,
  onSelectGroup,
}) => {
  const [isHovered, setIsHovered] = useState(false)

  const modeLabel =
    labelType === 'date' ? (dateMode === 'capture' ? 'by capture date' : 'by upload date') : null

  const selectedCount = groupItemIds.filter((id) => selectedIds.has(id)).length
  const allSelected = selectedCount === groupItemIds.length && groupItemIds.length > 0
  const someSelected = selectedCount > 0 && !allSelected

  // Checkbox is always visible in selection mode; revealed on hover otherwise.
  const showCheckbox = isSelectionMode || isHovered

  const ariaChecked = allSelected ? true : someSelected ? 'mixed' : false

  return (
    <div
      className={isFirst ? 'mb-6' : 'mt-16 mb-6'}
      role="rowheader"
      aria-label={`${label} — ${count} ${count === 1 ? 'asset' : 'assets'}${modeLabel ? `, ${modeLabel}` : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {!isFirst && (
        <div className="h-px w-full bg-black/[0.04] dark:bg-white/[0.06] mb-6" aria-hidden="true" />
      )}
      <div className="flex items-center gap-3">
        {/* Group select checkbox — subtle, discoverable, not advertised */}
        <button
          role="checkbox"
          aria-checked={ariaChecked}
          aria-label={`Select all ${count} ${count === 1 ? 'item' : 'items'} in ${label}`}
          onClick={() => onSelectGroup(groupItemIds, allSelected)}
          className={cn(
            'flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center transition-all duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gallery-gold focus-visible:ring-offset-1',
            allSelected || someSelected
              ? 'text-gallery-gold'
              : 'text-on-surface/25 hover:text-on-surface/50',
            showCheckbox ? 'opacity-100' : 'opacity-0 pointer-events-none',
          )}
          tabIndex={showCheckbox ? 0 : -1}
        >
          {allSelected ? (
            <CheckSquare size={15} />
          ) : someSelected ? (
            <MinusSquare size={15} />
          ) : (
            <Square size={15} />
          )}
        </button>

        <h2
          className={
            labelType === 'date'
              ? 'font-mono text-xs tracking-[0.18em] text-on-surface/60 uppercase'
              : 'font-semibold text-sm text-primary tracking-tight'
          }
        >
          {label}
        </h2>
        <span
          className="font-mono text-[10px] tracking-widest text-on-surface/35 uppercase"
          aria-hidden="true"
        >
          {count} {count === 1 ? 'item' : 'items'}
          {modeLabel && ` · ${modeLabel}`}
        </span>
      </div>
    </div>
  )
}
