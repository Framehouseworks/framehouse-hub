'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, X, Loader2 } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import { cn } from '@/utilities/cn'

const QUICK_FILTERS = ['RAW', 'Video', 'Drone', 'Portrait'] as const
const SUGGEST_DEBOUNCE = 150

export const GlobalSearch: React.FC = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()

  const [inputValue, setInputValue] = useState(searchParams.get('search') || '')
  const [showDropdown, setShowDropdown] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const debouncedSuggest = useDebounce(inputValue, SUGGEST_DEBOUNCE)
  const activeSearch = searchParams.get('search') || ''

  // Keep input in sync with URL (e.g. clicking saved views)
  useEffect(() => {
    setInputValue(searchParams.get('search') || '')
  }, [searchParams])

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      } else if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Autocomplete suggestions only — no auto-navigate
  useEffect(() => {
    if (debouncedSuggest.length < 2) {
      setSuggestions([])
      return
    }
    let cancelled = false
    fetch(`/api/media/search?type=suggestions&q=${encodeURIComponent(debouncedSuggest)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { suggestions?: string[] } | null) => {
        if (!cancelled) setSuggestions(data?.suggestions ?? [])
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [debouncedSuggest])

  const navigate = useCallback(
    (query: string) => {
      setShowDropdown(false)
      inputRef.current?.blur()
      startTransition(() => {
        router.push(query ? `/dashboard?search=${encodeURIComponent(query)}` : '/dashboard')
      })
    },
    [router],
  )

  const handleClear = () => {
    setInputValue('')
    setSuggestions([])
    startTransition(() => router.push('/dashboard'))
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') navigate(inputValue)
    if (e.key === 'Escape') {
      setShowDropdown(false)
      inputRef.current?.blur()
    }
  }

  return (
    <div className="relative w-full">
      {/* Input + progress bar share the same relative container so the bar aligns to the input */}
      <div className="relative group overflow-hidden rounded-[16px]" role="search">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface/30 group-focus-within:text-gallery-gold transition-colors pointer-events-none z-10" />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder="Search your visual archive..."
          className="w-full h-11 pl-12 pr-14 bg-gallery-surface/50 text-sm outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gallery-gold/20 focus:bg-white dark:focus:bg-white/5 transition-all rounded-[16px]"
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center z-10">
          {isPending ? (
            <Loader2 size={14} className="animate-spin text-gallery-gold" />
          ) : inputValue ? (
            <button
              onMouseDown={(e) => {
                e.preventDefault()
                handleClear()
              }}
              className="text-on-surface/30 hover:text-on-surface/60 transition-colors"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          ) : (
            <span className="text-[10px] font-rubik text-on-surface/20 pointer-events-none select-none">
              ⌘K
            </span>
          )}
        </div>

        {/* Gold progress bar — hugs the bottom edge of the input */}
        <div
          className={cn(
            'absolute bottom-0 left-0 right-0 h-[2px] bg-gallery-gold origin-left transition-opacity duration-300',
            isPending ? 'opacity-100' : 'opacity-0',
          )}
          style={isPending ? { animation: 'search-progress 1.4s ease-in-out infinite' } : undefined}
        />
      </div>

      {showDropdown && (
        <div className="absolute top-[calc(100%+8px)] left-0 right-0 z-50 bg-white/70 dark:bg-black/70 backdrop-blur-[20px] rounded-[24px] shadow-[0px_20px_40px_rgba(26,28,28,0.06)] p-4">
          <div className="flex flex-wrap gap-2 mb-3">
            {QUICK_FILTERS.map((f) => (
              <button
                key={f}
                onMouseDown={() => navigate(f.toLowerCase())}
                className={cn(
                  'px-3 py-1.5 rounded-full text-[10px] font-rubik uppercase tracking-wider transition-all',
                  activeSearch === f.toLowerCase()
                    ? 'bg-gallery-gold text-white'
                    : 'bg-gallery-red/15 text-gallery-red hover:bg-gallery-red/25',
                )}
              >
                {f}
              </button>
            ))}
          </div>

          {suggestions.length > 0 && (
            <div className="flex flex-col gap-0.5 border-t border-black/[0.04] dark:border-white/[0.04] pt-3">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onMouseDown={() => navigate(s)}
                  className="text-left px-3 py-2 rounded-xl text-sm text-on-surface/70 hover:bg-gallery-surface/50 hover:text-primary transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
