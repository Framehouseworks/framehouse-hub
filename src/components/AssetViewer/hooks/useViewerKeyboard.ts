'use client'

import { useEffect } from 'react'

interface UseViewerKeyboardProps {
  onClose: () => void
  onPrev: () => void
  onNext: () => void
  enabled: boolean
}

export function useViewerKeyboard({ onClose, onPrev, onNext, enabled }: UseViewerKeyboardProps) {
  useEffect(() => {
    if (!enabled) return
    const handler = (e: KeyboardEvent) => {
      // Don't intercept when focus is in an input/textarea (edit mode)
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        onPrev()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        onNext()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [enabled, onClose, onPrev, onNext])
}
