'use client'

import React, { useEffect, useState } from 'react'
import { MediaCard } from './MediaCard'
import type { Media } from '@/payload-types'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/utilities/cn'
import { CheckSquare } from 'lucide-react'

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
        <div key={item.id} className="relative group break-inside-avoid mb-4">
          <MediaCard
            media={item}
            isSelected={selectedIds.has(item.id)}
            onSelect={onSelect}
            onView={() => onView(item)}
            isSelectionMode={isSelectionMode || selectedIds.size > 0}
          />
          <AnimatePresence>
            {(isSelectionMode || selectedIds.has(item.id)) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => onSelect(item.id)}
                className={cn(
                  'absolute inset-0 z-30 rounded-[24px] border-2 transition-all cursor-pointer',
                  selectedIds.has(item.id)
                    ? 'border-gallery-gold bg-gallery-gold/5'
                    : 'border-white/20 hover:border-white/40',
                )}
              >
                <div
                  className={cn(
                    'absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all',
                    selectedIds.has(item.id)
                      ? 'bg-gallery-gold border-gallery-gold text-white shadow-lg'
                      : 'bg-black/20 border-white/40',
                  )}
                >
                  {selectedIds.has(item.id) && <CheckSquare size={12} />}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  )
}
