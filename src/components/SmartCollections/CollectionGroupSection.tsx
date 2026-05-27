'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/utilities/cn'

interface CollectionGroupSectionProps {
  label: string
  count: number
  defaultExpanded?: boolean
  children: React.ReactNode
}

export function CollectionGroupSection({
  label,
  count,
  defaultExpanded = true,
  children,
}: CollectionGroupSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const sectionId = `section-${label.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <section aria-labelledby={sectionId} className="flex flex-col gap-0">
      <button
        id={sectionId}
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls={`${sectionId}-content`}
        className={cn(
          'flex items-center justify-between w-full py-2.5 group',
          'hover:opacity-80 transition-opacity',
        )}
      >
        <span className="text-[10px] tracking-widest font-medium text-[#1a1c1c]/40 uppercase select-none">
          {label}
        </span>
        <div className="flex items-center gap-2">
          {!expanded && (
            <span className="font-rubik text-[10px] text-[#1a1c1c]/30 tabular-nums">
              {count} {count === 1 ? 'view' : 'views'}
            </span>
          )}
          <ChevronDown
            size={13}
            className={cn(
              'text-[#1a1c1c]/30 transition-transform duration-200',
              expanded && 'rotate-180',
            )}
          />
        </div>
      </button>

      {expanded && (
        <div
          id={`${sectionId}-content`}
          className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pb-4"
        >
          {children}
        </div>
      )}
    </section>
  )
}
