'use client'

import { useState } from 'react'
import { Sparkles, AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { TransferPreviewResponse } from './types'
import { TransferImagePreview } from './TransferImagePreview'
import { TransferVideoPreview } from './TransferVideoPreview'
import { TransferAudioPreview } from './TransferAudioPreview'
import { TransferDocumentPreview } from './TransferDocumentPreview'
import { TransferFallbackCard } from './TransferFallbackCard'

interface TransferMediaPreviewProps {
  previewData: TransferPreviewResponse | null
  isLoading: boolean
  filename: string
  filesize: number
  mimeType: string
  onRetry?: () => void
}

export function TransferMediaPreview({
  previewData,
  isLoading,
  filename,
  filesize,
  mimeType,
  onRetry,
}: TransferMediaPreviewProps) {
  const [loadError, setLoadError] = useState(false)

  // 1. Loading Skeleton
  if (isLoading) {
    return (
      <div className="w-full rounded-2xl bg-gallery-surface p-8 sm:p-10 flex flex-col items-center justify-center text-center space-y-3 min-h-[200px] animate-pulse">
        <div className="w-10 h-10 rounded-full bg-gallery-gold/20 flex items-center justify-center text-gallery-gold">
          <Sparkles size={20} className="animate-spin" />
        </div>
        <p className="font-rubik text-xs uppercase tracking-wider text-gallery-gold">
          Optimizing your preview... hang tight!
        </p>
        <p className="text-[11px] text-on-surface/40">
          Securing direct stream from storage enclave
        </p>
      </div>
    )
  }

  // 2. Fetch / Endpoint Error State
  if (!previewData || loadError) {
    return (
      <div className="w-full rounded-2xl bg-gallery-surface p-6 sm:p-8 flex flex-col items-center justify-center text-center space-y-3 min-h-[180px]">
        <AlertTriangle className="w-8 h-8 text-amber-500" />
        <p className="text-xs font-semibold text-primary">Preview unavailable at this moment</p>
        <p className="text-[11px] text-on-surface/50 max-w-xs">
          The preview stream could not be loaded. You can reload or proceed with direct download.
        </p>
        {onRetry && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setLoadError(false)
              onRetry()
            }}
            className="text-xs gap-1.5 h-8 font-rubik mt-1"
          >
            <RefreshCw size={12} />
            Try again
          </Button>
        )}
      </div>
    )
  }

  // 3. Fallback Card (unsupported format or exceeded threshold)
  if (!previewData.eligible || !previewData.previewUrl) {
    return (
      <TransferFallbackCard
        filename={previewData.filename || filename}
        filesize={previewData.filesize || filesize}
        mimeType={previewData.mimeType || mimeType}
        message={previewData.message}
      />
    )
  }

  // 4. Eligible Inline Dispatcher
  const handleMediaError = () => {
    if (onRetry) {
      onRetry()
    } else {
      setLoadError(true)
    }
  }

  switch (previewData.mediaType) {
    case 'image':
      return (
        <TransferImagePreview
          url={previewData.previewUrl}
          filename={previewData.filename || filename}
          onError={handleMediaError}
        />
      )
    case 'video':
      return (
        <TransferVideoPreview
          url={previewData.previewUrl}
          mimeType={previewData.mimeType || mimeType}
          onError={handleMediaError}
        />
      )
    case 'audio':
      return (
        <TransferAudioPreview
          url={previewData.previewUrl}
          filename={previewData.filename || filename}
          mimeType={previewData.mimeType || mimeType}
          onError={handleMediaError}
        />
      )
    case 'document':
      return (
        <TransferDocumentPreview
          url={previewData.previewUrl}
          filename={previewData.filename || filename}
          onError={handleMediaError}
        />
      )
    default:
      return (
        <TransferFallbackCard
          filename={previewData.filename || filename}
          filesize={previewData.filesize || filesize}
          mimeType={previewData.mimeType || mimeType}
          message={previewData.message}
        />
      )
  }
}

