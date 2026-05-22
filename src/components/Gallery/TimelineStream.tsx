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
    <div className="w-full">
      {groups.map((group) => (
        <div key={group.key}>
          <GroupHeader
            label={group.label}
            labelType={group.labelType}
            count={group.items.length}
            dateMode={dateMode}
          />
          <MasonryGrid
            items={group.items}
            selectedIds={selectedIds}
            isSelectionMode={isSelectionMode}
            onSelect={onSelect}
            onView={onView}
          />
        </div>
      ))}
    </div>
  )
}
