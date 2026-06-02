'use client'

import React from 'react'
import { CheckSquare, X } from 'lucide-react'
import { cn } from '@/utilities/cn'
import { useReviewMode } from './ReviewModeProvider'

/** Mobile-only "Select" pill that toggles selection mode on tap. */
export function SelectionModePill() {
  const review = useReviewMode()
  if (!review?.config.allowSelection) return null

  const { isSelectionMode, setSelectionMode } = review

  return (
    <div className="flex justify-end px-6 mb-4 md:hidden">
      <button
        type="button"
        onClick={() => setSelectionMode(!isSelectionMode)}
        className={cn(
          'flex items-center gap-1.5 h-9 px-3.5 rounded-2xl text-xs font-medium transition-all',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d79922]',
          isSelectionMode
            ? 'bg-[#d79922] text-[#1a1c1c]'
            : 'bg-white/8 text-white/60 hover:bg-white/12 hover:text-white/80',
        )}
        aria-pressed={isSelectionMode}
        aria-label={isSelectionMode ? 'Exit selection mode' : 'Enter selection mode'}
      >
        {isSelectionMode ? (
          <>
            <X size={12} />
            Done Selecting
          </>
        ) : (
          <>
            <CheckSquare size={12} />
            Select
          </>
        )}
      </button>
    </div>
  )
}
