'use client'

import { cn } from '@/utilities/cn'
import type { Media as MediaType } from '@/payload-types'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, X, MessageSquare } from 'lucide-react'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CommentPanel } from './review/CommentPanel'
import { useReviewMode } from './review/ReviewModeProvider'
import { SelectionCheckbox } from './review/SelectionCheckbox'

export interface LightboxItem {
  media: MediaType
  alt?: string | null
  caption?: string | null
  instanceTitle?: string | null
}

interface PortfolioLightboxProps {
  items: LightboxItem[]
  currentIndex: number
  sectionName?: string
  isOpen: boolean
  onClose: () => void
  onNavigate: (index: number) => void
  allowComments?: boolean
}

/**
 * Section-scoped lightbox with keyboard nav, touch swipe, focus trap, and
 * download protection (right-click suppression on the displayed image).
 */
export function PortfolioLightbox({
  items,
  currentIndex,
  sectionName,
  isOpen,
  onClose,
  onNavigate,
  allowComments = false,
}: PortfolioLightboxProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [commentOpen, setCommentOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const review = useReviewMode()

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => { setIsMounted(true) }, [])

  // Lock body scroll while open; restore on unmount/close
  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [isOpen])

  // Move focus to close button on open
  useEffect(() => {
    if (isOpen) {
      // rAF ensures the portal has painted before focus
      requestAnimationFrame(() => closeButtonRef.current?.focus())
    }
  }, [isOpen])

  const goNext = useCallback(() => {
    if (currentIndex < items.length - 1) onNavigate(currentIndex + 1)
  }, [currentIndex, items.length, onNavigate])

  const goPrev = useCallback(() => {
    if (currentIndex > 0) onNavigate(currentIndex - 1)
  }, [currentIndex, onNavigate])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose() }
      if (e.key === 'ArrowRight') { e.preventDefault(); goNext() }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev() }
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [isOpen, onClose, goNext, goPrev])

  // Touch swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current)
    // Only swipe if predominantly horizontal (dy < 80px)
    if (Math.abs(dx) > 48 && dy < 80) {
      if (dx < 0) goNext()
      else goPrev()
    }
  }

  const handleBackdropClick = () => onClose()
  const stopProp = (e: React.MouseEvent) => e.stopPropagation()

  const current = items[currentIndex]
  if (!isMounted || !current) return null

  const media = current.media
  const src = media.proxyUrl ?? media.originalUrl ?? media.thumbnailUrl ?? media.url ?? undefined
  const caption = current.caption ?? current.instanceTitle ?? null
  const altText = current.alt ?? media.alt ?? media.title ?? media.filename ?? ''
  const accessionId = (media as MediaType & { accessionId?: string | null }).accessionId
  const atStart = currentIndex === 0
  const atEnd = currentIndex === items.length - 1
  const showCommentPanel = allowComments && review?.config.allowComments

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={`${sectionName ? sectionName + ' — ' : ''}Image ${currentIndex + 1} of ${items.length}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[200] flex flex-col select-none"
          style={{ backgroundColor: 'rgba(0,0,0,0.96)' }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={handleBackdropClick}
        >
          {/* ── Control bar (glassmorphism) ────────────────────────────────── */}
          <div
            className="flex items-center justify-between px-4 md:px-8 h-14 flex-shrink-0"
            style={{
              background: 'rgba(255,255,255,0.06)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
            onClick={stopProp}
          >
            {/* Close */}
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="flex items-center justify-center w-9 h-9 rounded-full text-white/50 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:rounded-full"
              aria-label="Close lightbox"
            >
              <X size={18} strokeWidth={1.5} />
            </button>

            {/* Section name + counter */}
            <div className="flex flex-col items-center gap-0.5 pointer-events-none">
              {sectionName && (
                <span
                  className="text-[9px] uppercase tracking-[0.3em] text-white/30"
                  style={{ fontFamily: "'Rubik Mono One', monospace" }}
                >
                  {sectionName}
                </span>
              )}
              <span className="text-[11px] text-white/40 tabular-nums">
                {currentIndex + 1} / {items.length}
              </span>
            </div>

            {/* Right controls: Prev/Next + Comments toggle + Selection */}
            <div className="flex items-center gap-1">
              {showCommentPanel && (
                <button
                  type="button"
                  onClick={() => setCommentOpen((o) => !o)}
                  className={cn(
                    'flex items-center justify-center w-9 h-9 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:rounded-full',
                    commentOpen ? 'text-[#d79922] bg-[#d79922]/10' : 'text-white/50 hover:text-white',
                  )}
                  aria-label={commentOpen ? 'Close notes panel' : 'Open notes panel'}
                  aria-pressed={commentOpen}
                >
                  <MessageSquare size={15} />
                </button>
              )}
              {review?.config.allowSelection && (
                <SelectionCheckbox
                  mediaId={media.id}
                  instanceId={'lightbox'}
                  itemTitle={altText}
                  alwaysVisible
                />
              )}
              <button
                type="button"
                onClick={goPrev}
                disabled={atStart}
                className="flex items-center justify-center w-9 h-9 rounded-full text-white/50 hover:text-white disabled:opacity-20 disabled:pointer-events-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:rounded-full"
                aria-label="Previous image"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={atEnd}
                className={cn(
                  'flex items-center justify-center w-9 h-9 rounded-full text-white/50 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:rounded-full',
                  atEnd && 'opacity-20 pointer-events-none',
                )}
                aria-label={atEnd ? 'End of section' : 'Next image'}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* ── Main content row (image + optional comment panel) ─────────── */}
          <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* ── Image area ──────────────────────────────────────────────────── */}
          <div
            className="flex-1 flex items-center justify-center px-4 py-4 min-h-0 overflow-hidden"
            aria-live="polite"
          >
            <div
              className="relative flex items-center justify-center max-w-full max-h-full"
              onClick={stopProp}
              onContextMenu={(e) => e.preventDefault()}
              style={{ userSelect: 'none', WebkitUserSelect: 'none' } as React.CSSProperties}
            >
              <AnimatePresence mode="wait">
                <motion.img
                  key={currentIndex}
                  src={src}
                  alt={altText}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  draggable={false}
                  className="max-w-[88vw] max-h-[calc(100vh-160px)] object-contain shadow-2xl"
                  style={
                    {
                      WebkitTouchCallout: 'none',
                      pointerEvents: 'none',
                    } as React.CSSProperties
                  }
                />
              </AnimatePresence>
            </div>
          </div>

          {/* ── Comment panel (desktop: right side; mobile: bottom sheet) ─── */}
          {showCommentPanel && !isMobile && (
            <div className="w-[280px] flex-shrink-0 overflow-hidden relative" onClick={stopProp}>
              <CommentPanel
                mediaId={media.id}
                isMobile={false}
                isOpen={true}
              />
            </div>
          )}

          </div>{/* End main content row */}

          {/* ── Mobile comment bottom sheet ─────────────────────────────────── */}
          {showCommentPanel && isMobile && (
            <div className="absolute inset-x-0 bottom-0 z-20" onClick={stopProp}>
              <CommentPanel
                mediaId={media.id}
                isMobile={true}
                isOpen={commentOpen}
                onClose={() => setCommentOpen(false)}
              />
            </div>
          )}

          {/* ── Caption bar ─────────────────────────────────────────────────── */}
          <div
            className="flex-shrink-0 px-4 md:px-8 py-3 text-center min-h-[44px] flex flex-col items-center justify-center gap-1"
            style={{
              background: 'rgba(255,255,255,0.04)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
            onClick={stopProp}
          >
            {caption && (
              <p className="text-white/60 text-sm leading-snug">{caption}</p>
            )}
            {(media.filename || accessionId) && (
              <p
                className="text-white/20 text-[9px] uppercase tracking-[0.3em]"
                style={{ fontFamily: "'Rubik Mono One', monospace" }}
              >
                {[media.filename, accessionId].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
