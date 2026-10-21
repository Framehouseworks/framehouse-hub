'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import { cn } from '@/utilities/cn'
import type { TransferWallpaperCanvasProps, TransferWallpaper } from './types'
import { FALLBACK_TRANSFER_WALLPAPER } from './types'

/**
 * TransferWallpaperCanvas
 *
 * Full-bleed background media canvas for transfer recipient download views.
 * Architectural & Performance Guardrails:
 * 1. Zero Next.js compute routing: All media assets streamed directly via `unoptimized: true`
 * 2. Bandwidth contention protection: `fetchpriority="low"` on primary and preloaded images
 * 3. Accessibility & Motion: System `prefers-reduced-motion` freezes crossfades and timers
 * 4. Admin-configured rotation: Cycles based on each item's `displayDurationSeconds`
 * 5. Low-priority preloading: Secondary images prefetched via `requestIdleCallback`
 */
export const TransferWallpaperCanvas: React.FC<TransferWallpaperCanvasProps> = ({
  wallpapers = [],
  className,
  onWallpaperChange,
}) => {
  const activeList: TransferWallpaper[] =
    wallpapers.length > 0 ? wallpapers : [FALLBACK_TRANSFER_WALLPAPER]

  const [currentIndex, setCurrentIndex] = useState(0)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [loadedUrls, setLoadedUrls] = useState<Set<string>>(new Set())

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const currentWallpaper = activeList[currentIndex] || activeList[0]

  // Detect and subscribe to prefers-reduced-motion
  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  // Notify parent on wallpaper change
  useEffect(() => {
    if (currentWallpaper && onWallpaperChange) {
      onWallpaperChange(currentWallpaper)
    }
  }, [currentWallpaper, onWallpaperChange])

  // Low-priority client-side preloading of secondary artwork in rotation
  const preloadImage = useCallback((url: string) => {
    if (!url || loadedUrls.has(url) || typeof window === 'undefined') return

    const schedulePreload = () => {
      const img = new window.Image()
      // Hint low network priority to browser so file downloads are prioritized
      if ('fetchPriority' in img) {
        ;(img as HTMLImageElement & { fetchPriority: string }).fetchPriority = 'low'
      }
      img.src = url
      img.onload = () => {
        setLoadedUrls((prev) => new Set(prev).add(url))
      }
    }

    if ('requestIdleCallback' in window) {
      ;(window as unknown as { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback(schedulePreload)
    } else {
      setTimeout(schedulePreload, 1000)
    }
  }, [loadedUrls])

  // Preload next image in rotation
  useEffect(() => {
    if (activeList.length <= 1) return
    const nextIndex = (currentIndex + 1) % activeList.length
    const nextWallpaper = activeList[nextIndex]
    if (nextWallpaper?.assetUrl) {
      preloadImage(nextWallpaper.assetUrl)
    }
    if (nextWallpaper?.mobileAssetUrl) {
      preloadImage(nextWallpaper.mobileAssetUrl)
    }
  }, [currentIndex, activeList, preloadImage])

  // Admin-customisable rotation loop
  useEffect(() => {
    // If only one wallpaper or reduced motion preferred, do not rotate
    if (activeList.length <= 1 || prefersReducedMotion) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }

    const durationSeconds = currentWallpaper?.displayDurationSeconds || 45
    const durationMs = Math.max(5, Math.min(300, durationSeconds)) * 1000

    timerRef.current = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % activeList.length)
    }, durationMs)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [currentIndex, activeList.length, prefersReducedMotion, currentWallpaper?.displayDurationSeconds])

  // Focal point mapping for CSS object-position
  const getObjectPosition = (focalPoint?: string | null) => {
    switch (focalPoint) {
      case 'top':
        return 'center top'
      case 'bottom':
        return 'center bottom'
      case 'left':
        return 'left center'
      case 'right':
        return 'right center'
      case 'center':
      default:
        return 'center center'
    }
  }

  return (
    <div
      className={cn(
        'absolute inset-0 pointer-events-none -z-10 overflow-hidden bg-gallery-surface',
        className,
      )}
      aria-hidden="true"
    >
      {/* Visual Canvas Layers */}
      {activeList.map((wallpaper, idx) => {
        const isActive = idx === currentIndex
        const isNext = idx === (currentIndex + 1) % activeList.length
        // Only render active or preloaded/next image to conserve DOM & memory
        if (!isActive && !isNext && !loadedUrls.has(wallpaper.assetUrl)) {
          return null
        }

        const objectPosition = getObjectPosition(wallpaper.focalPoint)

        return (
          <div
            key={wallpaper.id || wallpaper.assetUrl || idx}
            className={cn(
              'absolute inset-0',
              prefersReducedMotion
                ? isActive
                  ? 'opacity-100'
                  : 'opacity-0'
                : 'transition-opacity duration-1000 ease-in-out',
              isActive ? 'opacity-100 z-[1]' : 'opacity-0 z-0',
            )}
          >
            {/* Desktop / Default Asset */}
            <div className={cn('relative w-full h-full', wallpaper.mobileAssetUrl ? 'hidden md:block' : 'block')}>
              <Image
                src={wallpaper.assetUrl}
                alt={wallpaper.title || 'Background artwork'}
                fill
                sizes="100vw"
                unoptimized
                priority={idx === 0}
                fetchPriority={idx === 0 ? 'auto' : 'low'}
                style={{ objectFit: 'cover', objectPosition }}
              />
            </div>

            {/* Mobile Asset (if defined) */}
            {wallpaper.mobileAssetUrl && (
              <div className="relative w-full h-full block md:hidden">
                <Image
                  src={wallpaper.mobileAssetUrl}
                  alt={wallpaper.title || 'Background artwork'}
                  fill
                  sizes="100vw"
                  unoptimized
                  fetchPriority="low"
                  style={{ objectFit: 'cover', objectPosition }}
                />
              </div>
            )}
          </div>
        )
      })}

      {/* Layer 1: Ambient Contrast Scrim */}
      {/* Ensures WCAG AA text contrast against high-luminance background visuals */}
      <div
        className={cn(
          'absolute inset-0 z-[2] transition-colors duration-700',
          'bg-black/25 dark:bg-black/45 backdrop-brightness-95',
        )}
      />
    </div>
  )
}
