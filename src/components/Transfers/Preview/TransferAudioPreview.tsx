'use client'

import { useState } from 'react'
import { AlertTriangle, Music, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TransferAudioPreviewProps {
  url: string
  filename: string
  mimeType?: string
  onError?: () => void
}

export function TransferAudioPreview({
  url,
  filename,
  mimeType,
  onError,
}: TransferAudioPreviewProps) {
  const [hasError, setHasError] = useState(false)

  const handleError = () => {
    setHasError(true)
    onError?.()
  }

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-black/5 dark:bg-white/5 text-center space-y-3 min-h-[160px]">
        <AlertTriangle className="w-8 h-8 text-amber-500" />
        <p className="text-xs text-on-surface/70">Failed to load audio stream.</p>
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
    <div className="w-full rounded-2xl bg-gallery-surface p-6 flex flex-col items-center justify-center space-y-4">
      <div className="w-12 h-12 rounded-full bg-gallery-gold/15 text-gallery-gold flex items-center justify-center">
        <Music size={24} />
      </div>

      <div className="text-center max-w-sm">
        <p className="text-xs font-semibold text-primary truncate">{filename}</p>
        <span className="font-rubik text-[9px] uppercase tracking-wider text-gallery-gold">
          Audio Playback
        </span>
      </div>

      <div className="w-full max-w-md pt-1">
        <audio
          src={url}
          controls
          preload="metadata"
          onError={handleError}
          className="w-full h-10 outline-none"
        >
          {mimeType && <source src={url} type={mimeType} />}
          Your browser does not support inline audio playback.
        </audio>
      </div>
    </div>
  )
}

