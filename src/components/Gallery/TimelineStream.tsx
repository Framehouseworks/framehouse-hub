'use client'

import React from 'react'
import type { Media } from '@/payload-types'
import type { MediaGroup, DateMode } from '@/lib/groupMedia'
import { GroupHeader } from './GroupHeader'
import { MasonryGrid } from './MasonryGrid'

interface TimelineStreamProps {
  groups: MediaGroup[]
  dateMode: DateMode
  selectedIds: Set<string | number>
  isSelectionMode: boolean
  onSelect: (id: string | number) => void
  onView: (media: Media) => void
}

export const TimelineStream: React.FC<TimelineStreamProps> = ({
  groups,
  dateMode,
  selectedIds,
  isSelectionMode,
  onSelect,
  onView,
}) => {
  return (
    <div className="w-full" role="feed" aria-label="Media archive timeline">
      {groups.map((group, index) => (
        <section
          key={group.key}
          aria-label={`${group.label} — ${group.items.length} ${group.items.length === 1 ? 'asset' : 'assets'}`}
        >
          <GroupHeader
            label={group.label}
            labelType={group.labelType}
            count={group.items.length}
            dateMode={dateMode}
            isFirst={index === 0}
          />
          <MasonryGrid
            items={group.items}
            selectedIds={selectedIds}
            isSelectionMode={isSelectionMode}
            onSelect={onSelect}
            onView={onView}
          />
        </section>
      ))}
    </div>
  )
}
