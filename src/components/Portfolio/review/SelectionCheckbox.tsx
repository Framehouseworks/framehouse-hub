'use client'

import React from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/utilities/cn'
import { useReviewMode } from './ReviewModeProvider'

interface SelectionCheckboxProps {
  mediaId: number
  instanceId: string
  itemTitle: string
  alwaysVisible?: boolean
}

export function SelectionCheckbox({
  mediaId,
  instanceId,
  itemTitle,
  alwaysVisible = false,
}: SelectionCheckboxProps) {
  const review = useReviewMode()
  if (!review?.config.allowSelection) return null

  const isSelected = review.selections.has(mediaId)
  const isSubmitted = review.submittedIds.has(mediaId)

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    review!.toggleSelection(mediaId, instanceId)
  }

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={isSelected}
      aria-label={isSelected ? `Deselect ${itemTitle}` : `Select ${itemTitle}`}
      onClick={handleClick}
      className={cn(
        'absolute top-2 left-2 z-10 w-7 h-7 rounded-full flex items-center justify-center',
        'transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d79922]',
        'opacity-0 group-hover/selectable:opacity-100 focus-within:opacity-100',
        (alwaysVisible || review.isSelectionMode) && 'opacity-100',
        isSubmitted
          ? 'bg-[#445aa5] border-2 border-[#445aa5]'
          : isSelected
            ? 'bg-[#d79922] border-2 border-[#7f5700]'
            : 'bg-black/50 border-2 border-white/50 backdrop-blur-sm hover:border-white/80',
      )}
    >
      {(isSelected || isSubmitted) && (
        <Check size={12} className="text-white" strokeWidth={3} />
      )}
    </button>
  )
}
