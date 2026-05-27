'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import type { Media } from '@/payload-types'

interface ProgressiveImageProps {
  media: Media
  /** Applied to the outermost wrapper div */
  className?: string
}

function resolveUrl(raw: string | null | undefined): string | null {
  if (!raw) return null
  if (raw.startsWith('http')) return raw
  const base = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
  return `${base}${raw}`
}

/** Renders thumbnail → proxy → original in three stacked layers; each fades in on load. */
export const ProgressiveImage: React.FC<ProgressiveImageProps> = ({ media, className }) => {
  const [thumbLoaded, setThumbLoaded] = useState(false)
  const [proxyLoaded, setProxyLoaded] = useState(false)
  const [fullLoaded, setFullLoaded] = useState(false)

  const thumbSrc = resolveUrl(media.thumbnailUrl)
  const proxySrc = resolveUrl(media.proxyUrl)
  const fullSrc = resolveUrl(media.originalUrl || media.url)

  const isProcessing = media.ingestionStatus === 'processing' || media.ingestionStatus === 'active'
  const isFailed = media.ingestionStatus === 'failed'

  return (
    <div className={`relative w-full h-full ${className ?? ''}`}>
      {/* Shimmer skeleton — hides once first layer loads */}
      {!thumbLoaded && !proxyLoaded && !fullLoaded && (
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-2xl overflow-hidden"
          style={{
            background:
              'linear-gradient(90deg, hsl(var(--gallery-surface)/0.6) 25%, hsl(var(--gallery-surface)/0.9) 50%, hsl(var(--gallery-surface)/0.6) 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 2s linear infinite',
          }}
        />
      )}

      {/* Layer 1: thumbnail (lowest quality, first to appear) */}
      {thumbSrc && !isFailed && (
        <Image
          src={thumbSrc}
          alt={media.alt || media.title}
          fill
          unoptimized
          draggable={false}
          className="object-contain select-none"
          style={{
            opacity: thumbLoaded ? 1 : 0,
            transition: 'opacity 0.2s ease',
            filter: proxyLoaded || fullLoaded ? 'none' : 'blur(2px)',
          }}
          onLoad={() => setThumbLoaded(true)}
          sizes="(max-width: 768px) 100vw, 70vw"
        />
      )}

      {/* Layer 2: proxy WebP (medium quality) */}
      {proxySrc && !isFailed && (
        <Image
          src={proxySrc}
          alt={media.alt || media.title}
          fill
          unoptimized
          draggable={false}
          className="object-contain select-none"
          style={{
            opacity: proxyLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
          onLoad={() => setProxyLoaded(true)}
          sizes="(max-width: 768px) 100vw, 70vw"
        />
      )}

      {/* Layer 3: full-resolution original */}
      {fullSrc && !isFailed && !isProcessing && (
        <Image
          src={fullSrc}
          alt={media.alt || media.title}
          fill
          unoptimized
          draggable={false}
          className="object-contain select-none"
          style={{
            opacity: fullLoaded ? 1 : 0,
            transition: 'opacity 0.4s ease',
          }}
          onLoad={() => setFullLoaded(true)}
          sizes="(max-width: 768px) 100vw, 70vw"
        />
      )}

      {/* Processing state overlay */}
      {isProcessing && !thumbSrc && !proxySrc && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-gallery-gold/30 border-t-gallery-gold animate-spin" />
          <span className="text-[10px] font-bold tracking-widest uppercase font-rubik text-gallery-gold/70">
            Processing…
          </span>
        </div>
      )}

      {/* Failed state overlay */}
      {isFailed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
          <span className="text-[10px] font-bold tracking-widest uppercase font-rubik text-red-400">
            Preview Unavailable
          </span>
        </div>
      )}
    </div>
  )
}
