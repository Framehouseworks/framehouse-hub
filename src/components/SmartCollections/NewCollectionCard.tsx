'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, Check, X, Loader2 } from 'lucide-react'
import { cn } from '@/utilities/cn'

interface NewCollectionCardProps {
  onCreateManual?: (name: string) => Promise<void>
}

export function NewCollectionCard({ onCreateManual }: NewCollectionCardProps) {
  const [isNaming, setIsNaming] = useState(false)
  const [name, setName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isNaming) inputRef.current?.focus()
  }, [isNaming])

  const handleCommit = async () => {
    const trimmed = name.trim()
    if (!trimmed || !onCreateManual) {
      setIsNaming(false)
      setName('')
      return
    }
    setIsSaving(true)
    try {
      await onCreateManual(trimmed)
      setName('')
      setIsNaming(false)
    } catch {
      // parent handles toast
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setIsNaming(false)
    setName('')
  }

  if (isNaming) {
    return (
      <div
        className={cn(
          'w-full min-w-0 flex flex-col items-stretch justify-center gap-4 overflow-hidden',
          'rounded-[24px] border-2 border-gallery-gold/30 bg-gallery-gold/[0.03]',
          'p-4 sm:p-6 min-h-[160px]',
        )}
      >
        {/* Container-focus pattern: ring on the wrapper, not the input */}
        <div
          className={cn(
            'w-full min-w-0 rounded-[14px] flex items-center overflow-hidden',
            'bg-black/[0.04] dark:bg-white/[0.05]',
            'focus-within:shadow-[0_0_0_2px_rgba(215,153,34,0.35)]',
            'transition-shadow',
          )}
        >
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCommit()
              if (e.key === 'Escape') handleCancel()
            }}
            placeholder="Collection name…"
            className="w-full min-w-0 px-3.5 py-2.5 text-sm text-primary bg-transparent outline-none focus:outline-none placeholder:text-on-surface/30"
            aria-label="New collection name"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCancel}
            className="w-8 h-8 rounded-[10px] bg-black/[0.04] dark:bg-white/[0.05] flex items-center justify-center text-on-surface/40 hover:text-primary transition-colors"
            aria-label="Cancel"
          >
            <X size={14} />
          </button>
          <button
            onClick={handleCommit}
            disabled={!name.trim() || isSaving}
            className="w-8 h-8 rounded-[10px] bg-gallery-gold flex items-center justify-center text-white disabled:opacity-40 transition-opacity"
            aria-label="Create collection"
          >
            {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Check size={14} />}
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setIsNaming(true)}
      className={cn(
        'group w-full flex flex-col items-center justify-center gap-3',
        'rounded-[24px] border-2 border-dashed border-on-surface/10',
        'p-6 text-center transition-all duration-200',
        'hover:border-gallery-gold/30 hover:bg-gallery-gold/[0.02]',
        'aspect-[4/5] sm:aspect-auto min-h-[180px]',
        'focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_rgba(215,153,34,0.35)]',
      )}
      aria-label="Create new collection"
    >
      <div className="w-10 h-10 rounded-full border-2 border-dashed border-on-surface/20 group-hover:border-gallery-gold/40 flex items-center justify-center transition-colors">
        <Plus size={18} className="text-on-surface/30 group-hover:text-gallery-gold transition-colors" />
      </div>
      <div>
        <p className="text-sm font-semibold text-on-surface/50 group-hover:text-gallery-gold transition-colors">
          New Collection
        </p>
        <p className="text-xs text-on-surface/30 mt-0.5 leading-relaxed">
          Curate assets by hand
        </p>
      </div>
    </button>
  )
}
