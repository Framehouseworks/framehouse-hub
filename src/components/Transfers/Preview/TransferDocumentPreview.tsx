'use client'

import { useState, useEffect } from 'react'
import { ExternalLink, FileText, AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TransferDocumentPreviewProps {
  url: string
  filename: string
  onError?: () => void
}

export function TransferDocumentPreview({
  url,
  filename,
  onError,
}: TransferDocumentPreviewProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    // Detect mobile touch screen where iframe PDF rendering is unsupported or degraded
    const checkMobile = () => {
      const isTouch =
        typeof window !== 'undefined' &&
        ('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 768)
      setIsMobile(Boolean(isTouch))
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-black/5 dark:bg-white/5 text-center space-y-3 min-h-[220px]">
        <AlertTriangle className="w-8 h-8 text-amber-500" />
        <p className="text-xs text-on-surface/70">Failed to render document preview.</p>
        {onError && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setHasError(false)
              onError()
            }}
            className="text-xs gap-1.5 h-8 font-rubik"
          >
            <RefreshCw size={12} />
            Reload preview
          </Button>
        )}
      </div>
    )
  }

  // Mobile / Touch Layout: Embedded iframes often fail or auto-download on iOS/Android
  if (isMobile) {
    return (
      <div className="w-full rounded-2xl bg-gallery-surface p-6 flex flex-col items-center justify-center text-center space-y-4 min-h-[200px]">
        <div className="w-12 h-12 rounded-2xl bg-gallery-gold/15 text-gallery-gold flex items-center justify-center">
          <FileText size={24} />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold text-primary truncate max-w-xs">{filename}</p>
          <p className="text-[11px] text-on-surface/50 max-w-xs">
            Mobile browsers offer enhanced readability in a dedicated inspection tab.
          </p>
        </div>
        <a href={url} target="_blank" rel="noopener noreferrer" className="block pt-1">
          <Button variant="gallery" size="sm" className="h-9 gap-2 text-xs font-rubik">
            <ExternalLink size={14} />
            Inspect PDF in New Tab
          </Button>
        </a>
      </div>
    )
  }

  // Desktop Layout: Embedded sandbox iframe
  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 min-h-[350px] sm:min-h-[480px]">
      <iframe
        src={`${url}#toolbar=0&navpanes=0`}
        title={`Preview: ${filename}`}
        onError={() => {
          setHasError(true)
          onError?.()
        }}
        className="w-full h-[350px] sm:h-[480px] border-0 rounded-2xl"
      />
    </div>
  )
}

