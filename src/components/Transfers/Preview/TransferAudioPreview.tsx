'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { AlertTriangle, Play, Pause, RefreshCw, Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TransferAudioPreviewProps {
  url: string
  filename: string
  mimeType?: string
  onError?: () => void
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`
}

// Generate a deterministic aesthetic waveform profile from filename
function generateWaveformBars(name: string, count = 48): number[] {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i)
    hash |= 0
  }

  const bars: number[] = []
  for (let i = 0; i < count; i++) {
    const pseudoRandom = Math.abs(Math.sin((hash + i * 13) * 0.17))
    // Bell curve weighting towards center for editorial visual appeal
    const centerWeight = 1 - Math.abs((i - count / 2) / (count / 2)) * 0.4
    const heightPercent = Math.max(16, Math.min(100, Math.round(pseudoRandom * 85 * centerWeight + 15)))
    bars.push(heightPercent)
  }
  return bars
}

export function TransferAudioPreview({
  url,
  filename,
  mimeType,
  onError,
}: TransferAudioPreviewProps) {
  const [hasError, setHasError] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const waveformRef = useRef<HTMLDivElement | null>(null)
  const isScrubbingRef = useRef(false)
  const prevVolumeRef = useRef(1)

  const waveformBars = useRef(generateWaveformBars(filename)).current

  const progress = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play().catch(() => {})
    }
  }

  const handleVolumeChange = (newVol: number) => {
    const clamped = Math.max(0, Math.min(1, newVol))
    setVolume(clamped)
    if (audioRef.current) {
      audioRef.current.volume = clamped
      if (clamped === 0) {
        audioRef.current.muted = true
        setIsMuted(true)
      } else if (isMuted) {
        audioRef.current.muted = false
        setIsMuted(false)
      }
    }
  }

  const toggleMute = () => {
    if (!audioRef.current) return
    if (isMuted || volume === 0) {
      const restored = prevVolumeRef.current > 0 ? prevVolumeRef.current : 0.8
      audioRef.current.muted = false
      audioRef.current.volume = restored
      setVolume(restored)
      setIsMuted(false)
    } else {
      prevVolumeRef.current = volume
      audioRef.current.muted = true
      setIsMuted(true)
    }
  }

  const seekFromPointer = useCallback(
    (clientX: number) => {
      if (!waveformRef.current || !duration) return
      const rect = waveformRef.current.getBoundingClientRect()
      if (rect.width <= 0) return
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      const targetTime = ratio * duration
      setCurrentTime(targetTime)
      if (audioRef.current) {
        audioRef.current.currentTime = targetTime
      }
    },
    [duration],
  )

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation()
    isScrubbingRef.current = true
    seekFromPointer(e.clientX)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isScrubbingRef.current) {
      seekFromPointer(e.clientX)
    }
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isScrubbingRef.current) {
      seekFromPointer(e.clientX)
      isScrubbingRef.current = false
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        // Safe no-op
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return
    if (e.key === 'ArrowRight') {
      const targetTime = Math.min(duration, currentTime + 5)
      audioRef.current.currentTime = targetTime
      setCurrentTime(targetTime)
    } else if (e.key === 'ArrowLeft') {
      const targetTime = Math.max(0, currentTime - 5)
      audioRef.current.currentTime = targetTime
      setCurrentTime(targetTime)
    } else if (e.key === ' ') {
      e.preventDefault()
      togglePlay()
    }
  }

  // Bind audio element lifecycle listeners once on mount
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onTimeUpdate = () => {
      if (!isScrubbingRef.current) {
        setCurrentTime(audio.currentTime)
      }
    }
    const onLoadedMetadata = () => {
      setDuration(audio.duration || 0)
    }
    const onDurationChange = () => {
      setDuration(audio.duration || 0)
    }
    const onEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }
    const onErr = () => {
      setHasError(true)
      onError?.()
    }

    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('durationchange', onDurationChange)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onErr)

    // Check if metadata is already loaded
    if (audio.duration && !isNaN(audio.duration)) {
      setDuration(audio.duration)
    }

    return () => {
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('durationchange', onDurationChange)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onErr)
    }
  }, [onError])

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

  const effectiveVolume = isMuted ? 0 : volume

  return (
    <div className="w-full rounded-2xl bg-gallery-surface p-5 sm:p-6 flex flex-col space-y-4">
      <audio ref={audioRef} src={url} preload="metadata">
        {mimeType && <source src={url} type={mimeType} />}
      </audio>

      {/* Header Attribution & Timers */}
      <div className="flex items-center justify-between gap-3">
        <span className="font-rubik text-[9.5px] uppercase tracking-wider text-gallery-gold">
          {isPlaying ? 'Now Playing' : 'Ready to Stream'}
        </span>

        <div className="flex items-center gap-1.5 font-rubik text-[11px] text-on-surface/60 shrink-0">
          <span className="text-primary font-medium">{formatTime(currentTime)}</span>
          <span className="text-on-surface/30">/</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Touch-Accessible Clickable & Draggable Waveform Scrubber */}
      <div
        ref={waveformRef}
        role="slider"
        tabIndex={0}
        aria-label="Audio scrubber"
        aria-valuemin={0}
        aria-valuemax={duration || 100}
        aria-valuenow={currentTime}
        aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onKeyDown={handleKeyDown}
        className="group relative w-full h-16 py-1 px-1 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-between gap-1 cursor-pointer select-none touch-none outline-none focus:outline-none"
      >
        {waveformBars.map((height, i) => {
          // Compare each bar to current audio progress ratio
          const barRatio = (i + 0.5) / waveformBars.length
          const isPlayed = barRatio <= progress

          return (
            <div
              key={i}
              className="flex-1 h-full flex items-center justify-center pointer-events-none"
            >
              <div
                style={{ height: `${height}%` }}
                className={`w-full max-w-[4px] rounded-full transition-colors duration-75 ${
                  isPlayed
                    ? 'bg-gallery-gold shadow-[0_0_8px_rgba(127,87,0,0.3)]'
                    : 'bg-black/15 dark:bg-white/20 group-hover:bg-black/25 dark:group-hover:bg-white/30'
                }`}
              />
            </div>
          )
        })}

        {/* Playhead Indicator */}
        <div
          style={{ left: `${progress * 100}%` }}
          className="absolute top-1 bottom-1 w-0.5 bg-gallery-gold -translate-x-1/2 pointer-events-none shadow-sm"
        >
          <div className="w-2.5 h-2.5 rounded-full bg-gallery-gold -translate-x-[4px] -translate-y-1 shadow-[0_2px_6px_rgba(127,87,0,0.4)]" />
        </div>
      </div>

      {/* Transport Controls & Volume Slider */}
      <div className="flex items-center justify-between gap-4 pt-1">
        <Button
          type="button"
          variant="gallery"
          size="sm"
          onClick={togglePlay}
          className="h-10 px-4 gap-2 rounded-xl text-xs font-rubik tracking-wider uppercase shadow-[0px_4px_12px_rgba(127,87,0,0.2)]"
        >
          {isPlaying ? (
            <>
              <Pause size={14} className="fill-current" />
              <span>Pause</span>
            </>
          ) : (
            <>
              <Play size={14} className="fill-current ml-0.5" />
              <span>Play</span>
            </>
          )}
        </Button>

        {/* Volume Controls with Interactive Slider */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleMute}
            aria-label={effectiveVolume === 0 ? 'Unmute' : 'Mute'}
            className="h-8 w-8 p-0 text-on-surface/60 hover:text-gallery-gold dark:hover:text-gallery-gold hover:bg-gallery-gold/10 rounded-lg shrink-0 transition-colors"
          >
            {effectiveVolume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </Button>

          <input
            type="range"
            min="0"
            max="1"
            step="0.02"
            value={effectiveVolume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            aria-label="Volume slider"
            className="w-16 sm:w-20 h-1.5 accent-gallery-gold bg-black/10 dark:bg-white/15 rounded-lg appearance-none cursor-pointer focus:outline-none"
          />
        </div>
      </div>
    </div>
  )
}
