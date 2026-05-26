'use client'

import React, { useEffect, useState } from 'react'
import { MediaCard } from './MediaCard'
import type { Media } from '@/payload-types'

function useColumnCount() {
  const [cols, setCols] = useState(3)
  useEffect(() => {
    const update = () => {
      if (window.innerWidth < 768) setCols(2)
      else if (window.innerWidth < 1024) setCols(3)
      else setCols(4)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  return cols
}

interface MasonryGridProps {
  items: Media[]
  selectedIds: Set<string | number>
  isSelectionMode: boolean
  onSelect: (id: string | number) => void
  onView: (media: Media) => void
}

export const MasonryGrid: React.FC<MasonryGridProps> = ({
  items,
  selectedIds,
  isSelectionMode,
  onSelect,
  onView,
}) => {
  const cols = useColumnCount()

  return (
    <div style={{ columnCount: cols, columnGap: '1rem' }}>
      {items.map((item) => (
        <div key={item.id} className="break-inside-avoid mb-4">
          <MediaCard
            media={item}
            isSelected={selectedIds.has(item.id)}
            onSelect={onSelect}
            onView={() => onView(item)}
            isSelectionMode={isSelectionMode || selectedIds.size > 0}
          />
        </div>
      ))}
    </div>
  )
}
