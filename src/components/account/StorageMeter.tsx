'use client'

import React from 'react'
import Link from 'next/link'
import { cn } from '@/utilities/cn'

export type StorageData = {
  totalBytes: number
  byType: { image: number; video: number; audio: number; other: number }
  tierLimitBytes: number
  usagePercent: number
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const val = bytes / 1024 ** i
  return `${val < 10 ? val.toFixed(1) : Math.round(val)} ${units[i]}`
}

const SEGMENTS = [
  { key: 'image' as const, label: 'Images', color: 'bg-gallery-gold' },
  { key: 'video' as const, label: 'Video', color: 'bg-[#445aa5]' },
  { key: 'audio' as const, label: 'Audio', color: 'bg-gallery-red' },
  { key: 'other' as const, label: 'Other', color: 'bg-on-surface/20' },
]

type Props = {
  data: StorageData
  loading?: boolean
}

export const StorageMeter: React.FC<Props> = ({ data, loading }) => {
  const { totalBytes, byType, tierLimitBytes, usagePercent } = data

  const pct = (n: number) => (tierLimitBytes > 0 ? (n / tierLimitBytes) * 100 : 0)

  const isWarning = usagePercent >= 80 && usagePercent < 100
  const isOverage = usagePercent >= 100

  const trackColor = isOverage
    ? 'bg-gallery-red/20'
    : isWarning
      ? 'bg-amber-500/20'
      : 'bg-black/5 dark:bg-white/5'

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-3 rounded-full bg-on-surface/10" />
        <div className="h-4 rounded bg-on-surface/10 w-48" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Stacked bar */}
      <div>
        <div
          className={cn('h-3 rounded-full overflow-hidden flex', trackColor)}
          role="progressbar"
          aria-valuenow={Math.round(usagePercent)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Storage used: ${Math.round(usagePercent)}%`}
        >
          {SEGMENTS.map(({ key, color }) => {
            const w = pct(byType[key])
            if (w < 0.1) return null
            return (
              <div
                key={key}
                className={cn(color, 'h-full transition-[width] duration-700 ease-out')}
                style={{ width: `${Math.min(w, 100)}%` }}
              />
            )
          })}
        </div>

        {/* Summary line */}
        <div className="flex items-center justify-between mt-2">
          <span className="text-sm text-on-surface/60">
            <span className="font-rubik text-sm text-on-surface font-semibold">
              {formatBytes(totalBytes)}
            </span>{' '}
            of {formatBytes(tierLimitBytes)} used
          </span>
          <span
            className={cn(
              'font-rubik text-[11px] font-semibold tracking-wide',
              isOverage
                ? 'text-gallery-red animate-pulse'
                : isWarning
                  ? 'text-amber-500'
                  : 'text-gallery-gold',
            )}
          >
            {Math.round(usagePercent)}%
          </span>
        </div>
      </div>

      {/* Segment legend */}
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {SEGMENTS.map(({ key, label, color }) => {
          if (byType[key] === 0) return null
          return (
            <div key={key} className="flex items-center gap-2">
              <div className={cn('w-2.5 h-2.5 rounded-full shrink-0', color)} />
              <span className="text-xs text-on-surface/60">
                <span className="font-rubik text-xs text-on-surface/80">
                  {formatBytes(byType[key])}
                </span>{' '}
                {label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Threshold warnings */}
      {isWarning && (
        <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-xl px-4 py-2.5">
          You&apos;re approaching your storage limit. Consider archiving unused assets or upgrading
          your tier.
        </p>
      )}
      {isOverage && (
        <div className="flex items-center justify-between bg-gallery-red/5 rounded-xl px-4 py-3">
          <p className="text-xs text-gallery-red font-medium">
            Storage limit reached. New uploads will fail.
          </p>
          <Link
            href="/pricing"
            className="text-xs font-semibold text-gallery-red underline underline-offset-2 whitespace-nowrap ml-4"
          >
            Upgrade Tier →
          </Link>
        </div>
      )}
    </div>
  )
}
