'use client'

import { Check, ChevronDown, Plus } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { cn } from '@/utilities/cn'

export interface ComboboxOption {
  label: string
  value: string
}

interface ComboboxProps {
  options: ComboboxOption[]
  value?: string
  onChange: (value: string, isNew?: boolean) => void
  placeholder?: string
  allowCreate?: boolean
  createLabel?: (input: string) => string
  className?: string
  disabled?: boolean
  'aria-label'?: string
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Search or select…',
  allowCreate = false,
  createLabel = (v) => `Create "${v}"`,
  className,
  disabled,
  'aria-label': ariaLabel,
}: ComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedOption = options.find((o) => o.value === value)
  const displayValue = open ? query : (selectedOption?.label ?? '')

  const filtered = options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
  const showCreate =
    allowCreate && query.trim() && !options.some((o) => o.label.toLowerCase() === query.toLowerCase().trim())

  const listItems: Array<ComboboxOption | { value: '__create__'; label: string }> = showCreate
    ? [...filtered, { value: '__create__', label: createLabel(query.trim()) }]
    : filtered

  useEffect(() => {
    setCursor(0)
  }, [query])

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  function select(item: (typeof listItems)[number]) {
    if (item.value === '__create__') {
      onChange(query.trim(), true)
    } else {
      onChange(item.value)
    }
    setOpen(false)
    setQuery('')
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor((c) => Math.min(c + 1, listItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor((c) => Math.max(c - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (listItems[cursor]) select(listItems[cursor])
    } else if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
    }
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div
        className={cn(
          'flex items-center gap-2 rounded-[16px] bg-black/[0.04] dark:bg-white/[0.05] px-4 h-[44px] cursor-text transition-colors',
          'focus-within:bg-black/[0.07] dark:focus-within:bg-white/[0.08] focus-within:shadow-[0_0_0_2px_rgba(215,153,34,0.35)]',
          disabled && 'opacity-50 pointer-events-none',
        )}
        onClick={() => {
          setOpen(true)
          inputRef.current?.focus()
        }}
      >
        <input
          ref={inputRef}
          value={displayValue}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label={ariaLabel}
          className="flex-1 bg-transparent text-sm text-on-surface outline-none focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-on-surface/30 min-w-0"
          disabled={disabled}
          autoComplete="off"
        />
        <ChevronDown
          className={cn('h-4 w-4 text-on-surface/30 flex-shrink-0 transition-transform', open && 'rotate-180')}
        />
      </div>

      {open && listItems.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1.5 w-full rounded-[16px] bg-white dark:bg-[#1a1c22] shadow-[0_16px_40px_rgba(0,0,0,0.12)] overflow-auto max-h-52 py-1"
        >
          {listItems.map((item, i) => {
            const isCreate = item.value === '__create__'
            const isSelected = item.value === value
            return (
              <li
                key={item.value}
                role="option"
                aria-selected={isSelected}
                onMouseDown={(e) => {
                  e.preventDefault()
                  select(item)
                }}
                onMouseEnter={() => setCursor(i)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 text-sm cursor-pointer transition-colors',
                  i === cursor ? 'bg-black/[0.05] dark:bg-white/[0.08] text-on-surface' : 'text-on-surface/70',
                )}
              >
                {isCreate ? (
                  <Plus className="h-3.5 w-3.5 flex-shrink-0 text-gallery-gold" />
                ) : isSelected ? (
                  <Check className="h-3.5 w-3.5 flex-shrink-0 text-gallery-gold" />
                ) : (
                  <span className="h-3.5 w-3.5 flex-shrink-0" />
                )}
                <span className={cn(isCreate && 'text-gallery-gold')}>{item.label}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
