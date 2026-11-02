'use client'

import { useState } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TransferVideoPreviewProps {
  url: string
  mimeType?: string
  onError?: () => void
}

export function TransferVideoPreview({ url, mimeType, onError }: TransferVideoPreviewProps) {
  const [hasError, setHasError] = useState(false)

  const handleError = () => {
    setHasError(true)
    onError?.()
  }

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-black/5 dark:bg-white/5 text-center space-y-3 min-h-[220px]">
        <AlertTriangle className="w-8 h-8 text-amber-500" />
        <p className="text-xs text-on-surface/70">Failed to load video stream.</p>
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

  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-black/90 flex items-center justify-center min-h-[220px] max-h-[50vh] sm:max-h-[60vh]">
      <video
        src={url}
        controls
        playsInline
        preload="metadata"
        onError={handleError}
        className="w-full h-auto max-h-[50vh] sm:max-h-[60vh] rounded-2xl object-contain outline-none"
      >
        {mimeType && <source src={url} type={mimeType} />}
        Your browser does not support inline video playback.
      </video>
    </div>
  )
}

