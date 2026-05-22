import React from 'react'
import { cn } from '@/utilities/cn'
import type { DateMode } from '@/lib/groupMedia'

interface GroupHeaderProps {
  label: string
  labelType: 'date' | 'shoot'
  count: number
  dateMode: DateMode
}

export const GroupHeader: React.FC<GroupHeaderProps> = ({ label, labelType, count, dateMode }) => {
  return (
    <div className="flex items-baseline gap-4 mb-5 mt-10 first:mt-0">
      <span
        className={cn(
          labelType === 'date'
            ? 'font-mono text-[10px] tracking-[0.2em] text-on-surface/40 uppercase'
            : 'font-semibold text-base text-primary tracking-tight',
        )}
      >
        {label}
      </span>
      <span className="font-mono text-[9px] tracking-widest text-on-surface/25 uppercase">
        {count} {count === 1 ? 'item' : 'items'}
        {labelType === 'date' && dateMode === 'capture' && ' · by capture date'}
        {labelType === 'date' && dateMode === 'ingest' && ' · by upload date'}
      </span>
    </div>
  )
}
