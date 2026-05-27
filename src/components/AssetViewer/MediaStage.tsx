'use client'

import React, { useRef, useState, useEffect } from 'react'
import type { Media } from '@/payload-types'
import { ProgressiveImage } from './ProgressiveImage'
import { VideoStub } from './VideoStub'
import { useZoom } from './hooks/useZoom'
import { cn } from '@/utilities/cn'

interface MediaStageProps {
  media: Media
  onClose: () => void
  hasSidePanel: boolean
}

export const MediaStage: React.FC<MediaStageProps> = ({ media, onClose, hasSidePanel }) => {
  // ── Size tracking ─────────────────────────────────────────────────────
  // We observe the stage's content-box dimensions so we can compute the
  // image box as explicit pixel values. This means:
  //   • next/image `fill` always has a concrete parent size → always renders
  //   • shadow + rounded corners cover only image pixels, not dead space
  //   • zoom hit-zone is inset-0 within an already-correct-size box
  const stageRef = useRef<HTMLDivElement>(null)
  const [available, setAvailable] = useState<{ w: number; h: number }>(() => ({
    // Seed with window dimensions so the first render is already close;
    // ResizeObserver corrects to the exact content-box on mount.
    w: typeof window !== 'undefined' ? window.innerWidth : 800,
    h: typeof window !== 'undefined' ? window.innerHeight : 600,
  }))

  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setAvailable({ w: Math.floor(width), h: Math.floor(height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ── Zoom ──────────────────────────────────────────────────────────────
  // containerRef is inset-0 within the correctly-sized image box — every
  // pixel of the hit zone is a real image pixel.
  const containerRef = useRef<HTMLDivElement>(null)
  const {
    isZoomed,
    reset: resetZoom,
    style: zoomStyle,
    handlers: zoomHandlers,
  } = useZoom(containerRef)

  useEffect(() => {
    resetZoom()
  }, [media.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Image box dimensions ─────────────────────────────────────────────
  // Compute the largest rectangle with the image's aspect ratio that fits
  // inside the available (padded) stage area.
  const isVideo = media.mediaType === 'video'
  const isUnsupported = media.mediaType === 'audio' || media.mediaType === 'document'
  const isZoomable = !isVideo && !isUnsupported

  const naturalW = media.width || 4
  const naturalH = media.height || 3
  const imageAspect = naturalW / naturalH
  const availableAspect = available.h > 0 ? available.w / available.h : imageAspect

  let boxW: number
  let boxH: number
  if (imageAspect >= availableAspect) {
    // Landscape or square image wider than the available area → fit to width
    boxW = available.w
    boxH = Math.round(available.w / imageAspect)
  } else {
    // Portrait image taller than the available area → fit to height
    boxH = available.h
    boxW = Math.round(available.h * imageAspect)
  }

  return (
    // stageRef sits here so contentRect = available area after CSS padding
    <div
      ref={stageRef}
      className={cn(
        'absolute inset-0 flex items-center justify-center overflow-hidden',
        hasSidePanel ? 'px-14 py-8' : 'px-14 py-6 pb-20',
      )}
      onClick={onClose}
    >
      {/* ── Image box ───────────────────────────────────────────────── */}
      {/* Explicitly sized to the computed image dimensions.            */}
      {/* Shadow and rounded corners now hug the image — no dead zones. */}
      <div
        className={cn(
          'relative rounded-2xl overflow-hidden',
          'shadow-[0_40px_80px_rgba(0,0,0,0.5)]',
        )}
        style={{ width: boxW, height: boxH, ...zoomStyle }}
        onClick={(e) => e.stopPropagation()}
      >
        {isVideo && <VideoStub />}
        {!isVideo && !isUnsupported && <ProgressiveImage media={media} />}
        {isUnsupported && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.06] flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white/30"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
            </div>
            <span className="text-[10px] font-bold tracking-widest uppercase font-rubik text-white/30">
              Preview Unavailable
            </span>
          </div>
        )}

        {/* Zoom hit zone — inset-0 within the correctly-sized box.  */}
        {/* Every pixel here is image content. No dead zones.         */}
        {isZoomable && (
          <div
            ref={containerRef}
            className="absolute inset-0"
            style={{ cursor: isZoomed ? 'grab' : 'zoom-in', touchAction: 'none' }}
            {...zoomHandlers}
          />
        )}
      </div>
    </div>
  )
}
