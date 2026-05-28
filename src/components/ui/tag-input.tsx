'use client'

import { X } from 'lucide-react'
import { useRef, useState, type KeyboardEvent } from 'react'
import { cn } from '@/utilities/cn'

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  suggestions?: string[]
  placeholder?: string
  maxTags?: number
  className?: string
  disabled?: boolean
}

export function TagInput({
  tags,
  onChange,
  suggestions = [],
  placeholder = 'Add tag…',
  maxTags = 20,
  className,
  disabled,
}: TagInputProps) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const ghostSuggestions = suggestions.filter(
    (s) => !tags.some((t) => t.toLowerCase() === s.toLowerCase()),
  )

  function addTag(raw: string) {
    const val = raw.trim()
    if (!val || tags.length >= maxTags) return
    if (tags.some((t) => t.toLowerCase() === val.toLowerCase())) return
    onChange([...tags, val])
    setInput('')
  }

  function removeTag(index: number) {
    onChange(tags.filter((_, i) => i !== index))
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(input)
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags.length - 1)
    }
  }

  return (
    <div
      className={cn(
        'flex flex-wrap gap-1.5 rounded-[16px] bg-black/[0.04] dark:bg-white/[0.05] px-3 py-2.5 cursor-text min-h-[44px] transition-colors',
        'focus-within:ring-2 focus-within:ring-gallery-gold/30 focus-within:bg-black/[0.06] dark:focus-within:bg-white/[0.07]',
        disabled && 'opacity-50 pointer-events-none',
        className,
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 rounded-md bg-gallery-gold/15 px-2 py-0.5 text-xs font-medium text-gallery-gold"
        >
          {tag}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              removeTag(i)
            }}
            className="text-gallery-gold/60 hover:text-gallery-gold transition-colors"
            aria-label={`Remove ${tag}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}

      {tags.length < maxTags && (
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => addTag(input)}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface/30"
          disabled={disabled}
        />
      )}

      {ghostSuggestions.length > 0 && input === '' && (
        <div className="w-full flex flex-wrap gap-1 pt-1.5 mt-0.5">
          {ghostSuggestions.slice(0, 6).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addTag(s)}
              className="inline-flex items-center rounded-lg bg-black/[0.04] dark:bg-white/[0.05] px-2 py-0.5 text-xs text-on-surface/40 hover:text-on-surface/70 hover:bg-black/[0.07] dark:hover:bg-white/[0.08] transition-colors"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
