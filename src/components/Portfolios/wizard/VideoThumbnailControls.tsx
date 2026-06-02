'use client'

import React, { useRef, useState } from 'react'
import { Upload, Film, Clock, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/utilities/cn'
import type { VideoThumbnailOverride } from '../types'

interface Props {
  value: VideoThumbnailOverride
  onChange: (v: VideoThumbnailOverride) => void
  proxyVideoUrl: string | null
  thumbnailUrl: string | null
}

const MODES = [
  { value: 'auto' as const, icon: Film, label: 'Auto' },
  { value: 'timecode' as const, icon: Clock, label: 'Timecode' },
  { value: 'custom' as const, icon: Upload, label: 'Custom' },
]

function formatTimecode(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function parseTimecode(str: string): number {
  const parts = str.split(':').map(Number)
  if (parts.length === 2) return (parts[0] || 0) * 60 + (parts[1] || 0)
  return Number(str) || 0
}

export function VideoThumbnailControls({ value, onChange, proxyVideoUrl, thumbnailUrl }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const dropzoneRef = useRef<HTMLInputElement>(null)
  const [timecodeInput, setTimecodeInput] = useState(
    value.timecodeSeconds != null ? formatTimecode(value.timecodeSeconds) : '0:00',
  )
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  function setMode(mode: VideoThumbnailOverride['mode']) {
    onChange({ ...value, mode })
  }

  function handleTimecodeChange(raw: string) {
    setTimecodeInput(raw)
    const secs = parseTimecode(raw)
    if (!isNaN(secs)) {
      onChange({ ...value, timecodeSeconds: secs })
      if (videoRef.current) videoRef.current.currentTime = secs
    }
  }

  async function handleFileSelect(file: File) {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a JPG or PNG image.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB.')
      return
    }

    setUploading(true)
    try {
      // Upload via the existing local media registration endpoint
      const res = await fetch('/api/media/register-local', {
        method: 'POST',
        headers: {
          'Content-Type': file.type,
          'X-Filename': encodeURIComponent(file.name),
          'X-Upload-Meta': btoa(
            JSON.stringify({ title: `thumb_${file.name}`, isVideoThumbnail: true }),
          ),
        },
        body: file,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Upload failed')
      }

      const doc = await res.json()
      onChange({ ...value, mode: 'custom', customMedia: doc.id as number })
      toast.success('Custom thumbnail uploaded')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
      // Do not change mode on failure
    } finally {
      setUploading(false)
    }
  }

  const customThumbnailId =
    value.customMedia && typeof value.customMedia === 'object'
      ? (value.customMedia as { id: number }).id
      : value.customMedia

  return (
    <div className="flex flex-col gap-4">
      <p className="font-rubik text-[9px] tracking-[0.2em] text-on-surface/40 uppercase">
        Video thumbnail
      </p>

      {/* Mode selector */}
      <div className="flex gap-1.5" role="radiogroup" aria-label="Video thumbnail mode">
        {MODES.map(({ value: mode, icon: Icon, label }) => (
          <button
            key={mode}
            role="radio"
            aria-checked={value.mode === mode}
            onClick={() => setMode(mode)}
            className={cn(
              'flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl text-[10px] border transition-all',
              value.mode === mode
                ? 'border-gallery-gold/50 bg-gallery-gold/10 text-gallery-gold'
                : 'border-on-surface/8 text-on-surface/40 hover:border-on-surface/20',
            )}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Auto mode */}
      {value.mode === 'auto' && (
        <div className="rounded-xl overflow-hidden bg-zinc-900 aspect-video">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt="Auto-generated video thumbnail"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/20 text-xs">
              Worker-generated thumbnail
            </div>
          )}
        </div>
      )}

      {/* Timecode mode */}
      {value.mode === 'timecode' && (
        <div className="flex flex-col gap-3">
          {proxyVideoUrl ? (
            <video
              ref={videoRef}
              src={proxyVideoUrl}
              className="w-full rounded-xl aspect-video object-contain bg-zinc-950"
              controls
              preload="metadata"
              onTimeUpdate={(e) => {
                const secs = Math.floor((e.target as HTMLVideoElement).currentTime)
                setTimecodeInput(formatTimecode(secs))
                onChange({ ...value, timecodeSeconds: secs })
              }}
              aria-label="Video preview for timecode selection"
            />
          ) : (
            <div className="w-full aspect-video rounded-xl bg-zinc-900 flex items-center justify-center text-white/20 text-xs">
              Proxy video not yet available
            </div>
          )}
          <div className="flex items-center gap-2">
            <label
              htmlFor="timecode-input"
              className="font-rubik text-[9px] tracking-[0.2em] text-on-surface/40 uppercase flex-shrink-0"
            >
              At
            </label>
            <input
              id="timecode-input"
              type="text"
              value={timecodeInput}
              onChange={(e) => handleTimecodeChange(e.target.value)}
              placeholder="0:04"
              className="flex-1 bg-gallery-surface/60 rounded-xl px-3 py-2 text-sm text-primary border border-transparent focus:border-gallery-gold/40 focus:outline-none font-mono text-center"
              aria-label="Timecode (minutes:seconds)"
            />
            <button
              onClick={() => {
                if (videoRef.current) {
                  const secs = Math.floor(videoRef.current.currentTime)
                  setTimecodeInput(formatTimecode(secs))
                  onChange({ ...value, timecodeSeconds: secs })
                }
              }}
              className="text-[10px] text-gallery-gold hover:underline flex-shrink-0"
              aria-label="Use current video position"
            >
              Use current
            </button>
          </div>
          <p className="text-[10px] text-on-surface/25">
            Poster frame generation requires Go worker support (coming soon). Timecode is saved
            for future processing.
          </p>
        </div>
      )}

      {/* Custom upload mode */}
      {value.mode === 'custom' && (
        <div className="flex flex-col gap-3">
          <div
            role="button"
            tabIndex={0}
            aria-label="Upload custom thumbnail image. Drop a JPG or PNG here or click to browse."
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              const file = e.dataTransfer.files[0]
              if (file) handleFileSelect(file)
            }}
            onClick={() => dropzoneRef.current?.click()}
            onKeyDown={(e) => e.key === 'Enter' && dropzoneRef.current?.click()}
            className={cn(
              'flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed transition-all cursor-pointer',
              dragOver
                ? 'border-gallery-gold/60 bg-gallery-gold/8'
                : 'border-on-surface/15 hover:border-gallery-gold/30',
              uploading && 'pointer-events-none opacity-60',
            )}
          >
            {uploading ? (
              <>
                <Loader2 size={20} className="animate-spin text-gallery-gold" />
                <span className="text-xs text-on-surface/40">Uploading…</span>
              </>
            ) : customThumbnailId ? (
              <>
                <div className="w-8 h-8 rounded-full bg-gallery-gold/15 flex items-center justify-center">
                  <svg viewBox="0 0 10 8" className="w-2.5 text-gallery-gold" aria-hidden="true">
                    <path d="M1 4l3 3L9 1" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                  </svg>
                </div>
                <span className="text-xs text-on-surface/50">Custom thumbnail set (click to replace)</span>
              </>
            ) : (
              <>
                <Upload size={20} className="text-on-surface/30" />
                <span className="text-xs text-on-surface/40">Drop JPG/PNG or click to browse</span>
                <span className="text-[10px] text-on-surface/25">Max 5MB</span>
              </>
            )}
          </div>
          <input
            ref={dropzoneRef}
            type="file"
            accept="image/jpeg,image/png"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFileSelect(file)
              e.target.value = ''
            }}
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  )
}
