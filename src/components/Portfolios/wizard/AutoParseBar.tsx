'use client'

import React, { useEffect, useState } from 'react'
import { Sparkles, Undo2 } from 'lucide-react'

interface AutoParseBarProps {
  sectionCount: number
  onUndo: () => void
}

/**
 * Transient notification bar shown when auto-parse groups assets into sections.
 * Auto-dismisses after 10 seconds; provides an undo button to revert to flat grid.
 */
export function AutoParseBar({ sectionCount, onUndo }: AutoParseBarProps) {
  const [visible, setVisible] = useState(true)
  const [countdown, setCountdown] = useState(10)

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(interval); setVisible(false); return 0 }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  if (!visible) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-between gap-3 rounded-2xl bg-[#7f5700]/10 border border-[#7f5700]/20 px-4 py-3 mb-4"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <Sparkles size={14} className="text-[#7f5700] flex-shrink-0" aria-hidden="true" />
        <p className="text-xs text-on-surface/70">
          Organised into{' '}
          <span className="font-medium text-primary">{sectionCount} section{sectionCount !== 1 ? 's' : ''}</span>{' '}
          by asset type. Rename and rearrange below.
        </p>
      </div>
      <button
        type="button"
        onClick={() => { onUndo(); setVisible(false) }}
        className="flex items-center gap-1.5 text-[10px] font-medium text-[#7f5700] hover:text-[#a06a00] transition-colors flex-shrink-0 min-h-[44px] px-1"
        aria-label="Undo auto-organisation"
      >
        <Undo2 size={11} aria-hidden="true" />
        Undo ({countdown}s)
      </button>
    </div>
  )
}
