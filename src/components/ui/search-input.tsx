'use client'

import { Search, X } from 'lucide-react'
import { cn } from '@/utilities/cn'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  /** aria-label for the input */
  label?: string
}

/**
 * Local-filter search input.
 * Uses the container-focus pattern: the wrapper div receives the focus ring,
 * the inner input is transparent with no outline.
 * Matches the visual language of Combobox and GlobalSearch.
 */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  className,
  label,
}: SearchInputProps) {
  return (
    <div
      className={cn(
        'relative flex items-center gap-2 rounded-[16px] px-3.5 h-11',
        'bg-black/[0.04] dark:bg-white/[0.05]',
        'transition-shadow duration-150',
        'focus-within:shadow-[0_0_0_2px_rgba(215,153,34,0.35)]',
        className,
      )}
    >
      <Search size={14} className="text-on-surface/30 flex-shrink-0 pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label ?? placeholder}
        className="flex-1 bg-transparent text-sm text-primary placeholder:text-on-surface/30 outline-none focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 min-w-0"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="text-on-surface/30 hover:text-on-surface/70 transition-colors flex-shrink-0"
          aria-label="Clear search"
          tabIndex={-1}
        >
          <X size={13} />
        </button>
      )}
    </div>
  )
}
