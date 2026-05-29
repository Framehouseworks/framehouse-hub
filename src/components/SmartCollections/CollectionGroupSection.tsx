'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/utilities/cn'

interface CollectionGroupSectionProps {
  label: string
  count: number
  defaultExpanded?: boolean
  /** Optional action placed in the section header row (e.g. "+ New Collection" button) */
  headerAction?: React.ReactNode
  children: React.ReactNode
}

export function CollectionGroupSection({
  label,
  count,
  defaultExpanded = true,
  headerAction,
  children,
}: CollectionGroupSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const sectionId = `section-${label.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <section aria-labelledby={sectionId} className="flex flex-col gap-0">
      <div className="flex items-center justify-between w-full py-2.5">
        <button
          id={sectionId}
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls={`${sectionId}-content`}
          className="flex items-center gap-2 group hover:opacity-80 transition-opacity outline-none focus-visible:opacity-80"
        >
          <span className="text-[10px] tracking-widest font-medium text-on-surface/40 uppercase select-none">
            {label}
          </span>
          {!expanded && (
            <span className="font-rubik text-[10px] text-on-surface/30 tabular-nums">
              {count} {count === 1 ? 'view' : 'views'}
            </span>
          )}
          <ChevronDown
            size={13}
            className={cn(
              'text-on-surface/30 transition-transform duration-200',
              expanded && 'rotate-180',
            )}
          />
        </button>

        {/* Header action — always visible regardless of expanded state */}
        {headerAction && (
          <div className="flex-shrink-0">{headerAction}</div>
        )}
      </div>

      {expanded && (
        <div
          id={`${sectionId}-content`}
          className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pb-4 [&>*]:min-w-0"
        >
          {children}
        </div>
      )}
    </section>
  )
}
