import React from 'react'
import type { DateMode } from '@/lib/groupMedia'

interface GroupHeaderProps {
  label: string
  labelType: 'date' | 'shoot'
  count: number
  dateMode: DateMode
  isFirst?: boolean
}

export const GroupHeader: React.FC<GroupHeaderProps> = ({
  label,
  labelType,
  count,
  dateMode,
  isFirst,
}) => {
  const modeLabel =
    labelType === 'date' ? (dateMode === 'capture' ? 'by capture date' : 'by upload date') : null

  return (
    <div
      className={isFirst ? 'mb-6' : 'mt-16 mb-6'}
      role="rowheader"
      aria-label={`${label} — ${count} ${count === 1 ? 'asset' : 'assets'}${modeLabel ? `, ${modeLabel}` : ''}`}
    >
      {!isFirst && (
        <div className="h-px w-full bg-black/[0.04] dark:bg-white/[0.06] mb-6" aria-hidden="true" />
      )}
      <div className="flex items-center gap-3">
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
