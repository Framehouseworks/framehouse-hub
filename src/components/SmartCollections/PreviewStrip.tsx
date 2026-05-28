'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { cn } from '@/utilities/cn'

interface PreviewStripProps {
  filterQuery: Record<string, unknown> | null
  manualExcludes?: (number | string)[]
  className?: string
}

type PreviewState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; count: number; thumbnails: string[] }
  | { status: 'error' }

export function PreviewStrip({ filterQuery, manualExcludes, className }: PreviewStripProps) {
  const [state, setState] = useState<PreviewState>({ status: 'idle' })
  const abortRef = useRef<AbortController | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!filterQuery) {
      setState({ status: 'idle' })
      return
    }

    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(async () => {
      abortRef.current?.abort()
      abortRef.current = new AbortController()

      setState({ status: 'loading' })
      try {
        const res = await fetch('/api/smart-collections/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filterQuery, manualExcludes: manualExcludes ?? [] }),
          signal: abortRef.current.signal,
        })
        if (!res.ok) throw new Error('Preview failed')
        const data = await res.json()
        setState({ status: 'done', count: data.count, thumbnails: data.thumbnails })
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return
        setState({ status: 'error' })
      }
    }, 400)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [filterQuery, manualExcludes])

  return (
    <div
      className={cn(
        'bg-[#f3f3f4] rounded-[16px] px-4 py-3 flex items-center gap-3',
        className,
      )}
      aria-live="polite"
      aria-atomic="true"
    >
      {state.status === 'loading' && (
        <>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="w-7 h-7 rounded-[8px] bg-[#eeeeee] animate-pulse" aria-busy="true" />
          ))}
          <span className="font-rubik text-[9px] uppercase tracking-widest text-[#1a1c1c]/30 ml-1">
            Counting…
          </span>
        </>
      )}

      {state.status === 'done' && (
        <>
          <div className="flex gap-1">
            {state.thumbnails.slice(0, 4).map((src, i) => (
              <div key={i} className="relative w-7 h-7 rounded-[8px] overflow-hidden bg-[#eeeeee] flex-shrink-0">
                {src && <Image src={src} alt="" fill className="object-cover" sizes="28px" />}
              </div>
            ))}
            {Array.from({ length: Math.max(0, 4 - state.thumbnails.length) }).map((_, i) => (
              <div key={`empty-${i}`} className="w-7 h-7 rounded-[8px] bg-[#eeeeee]" />
            ))}
          </div>
          <span className="font-rubik text-[9px] uppercase tracking-widest text-gallery-gold">
            {state.count.toLocaleString()} ASSETS MATCH
          </span>
        </>
      )}

      {state.status === 'idle' && (
        <span className="font-rubik text-[9px] uppercase tracking-widest text-[#1a1c1c]/30">
          Add rules to preview
        </span>
      )}

      {state.status === 'error' && (
        <div className="bg-[#ff7f67]/10 rounded-[12px] px-3 py-2 text-xs text-[#1a1c1c]/60 w-full">
          Preview unavailable — check rules
        </div>
      )}

      {state.status === 'done' && state.count === 0 && (
        <span className="font-rubik text-[9px] uppercase tracking-widest text-[#1a1c1c]/30 ml-1">
          No assets match — adjust rules
        </span>
      )}
    </div>
  )
}
