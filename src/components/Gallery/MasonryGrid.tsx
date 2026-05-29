'use client'

import React, { useEffect, useRef, useState } from 'react'
import { MediaCard } from './MediaCard'
import type { Media } from '@/payload-types'

interface ColConfig {
  max: number
  floor: number
}

function useContainerColConfig(ref: React.RefObject<HTMLDivElement | null>): ColConfig {
  const [config, setConfig] = useState<ColConfig>({ max: 3, floor: 2 })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = (width: number) => {
      if (width < 480) setConfig({ max: 1, floor: 1 })
      else if (width < 640) setConfig({ max: 2, floor: 1 })
      else if (width < 1024) setConfig({ max: 3, floor: 2 })
      else setConfig({ max: 4, floor: 2 })
    }
    const ro = new ResizeObserver(([entry]) => update(entry.contentRect.width))
    ro.observe(el)
    update(el.offsetWidth)
    return () => ro.disconnect()
  }, [ref])
  return config
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
  const containerRef = useRef<HTMLDivElement>(null)
  const { max, floor } = useContainerColConfig(containerRef)
  const effectiveCols = Math.min(max, Math.max(floor, items.length))

  return (
    <div ref={containerRef} className="w-full min-w-0" style={{ columnCount: effectiveCols, columnGap: '1.25rem' }}>
      {items.map((item) => (
        <div key={item.id} className="break-inside-avoid mb-5">
          <MediaCard
            media={item}
            isSelected={selectedIds.has(item.id)}
            onSelect={onSelect}
            onView={onView}
            isSelectionMode={isSelectionMode || selectedIds.size > 0}
          />
        </div>
      ))}
    </div>
  )
}
