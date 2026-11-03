'use client'

import { useState } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TransferImagePreviewProps {
  url: string
  filename: string
  onError?: () => void
}

export function TransferImagePreview({ url, filename, onError }: TransferImagePreviewProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)

  const handleError = () => {
    setHasError(true)
    onError?.()
  }

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-black/5 dark:bg-white/5 text-center space-y-3 min-h-[220px]">
        <AlertTriangle className="w-8 h-8 text-amber-500" />
        <p className="text-xs text-on-surface/70">Failed to render image preview.</p>
        {onError && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setHasError(false)
              setIsLoaded(false)
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
    <div className="relative w-full overflow-hidden rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center min-h-[220px] max-h-[50vh] sm:max-h-[60vh]">
      {!isLoaded && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/10 dark:via-white/5 to-transparent flex items-center justify-center">
          <span className="font-rubik text-[10px] tracking-widest uppercase text-on-surface/40">
            Loading preview...
          </span>
        </div>
      )}
      {/* Native img to directly stream from signed GCS URL without server proxy */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={filename}
        onLoad={() => setIsLoaded(true)}
        onError={handleError}
        className={`w-full h-auto max-h-[50vh] sm:max-h-[60vh] object-contain transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        loading="lazy"
      />
    </div>
  )
}

