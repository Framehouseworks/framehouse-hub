'use client'

import React, { useEffect, useRef, useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X as CloseIcon } from 'lucide-react'
import type { Media } from '@/payload-types'
import { useAssetNavigation } from './hooks/useAssetNavigation'
import { useViewerKeyboard } from './hooks/useViewerKeyboard'
import { MediaStage } from './MediaStage'
import { MetadataPanel, PEEK_HEIGHT } from './MetadataPanel'
import { NavControls } from './NavControls'
import { ActionBar } from './ActionBar'
import { SafetyLockDeleteModal } from '@/components/Gallery/SafetyLockDeleteModal'
import { deleteMediaAction } from '@/app/(dashboard)/actions/media'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface AssetViewerProps {
  /** The media item that was clicked to open the viewer. null = viewer closed. */
  media: Media | null
  /** Full (filtered) list for sequential navigation */
  mediaList: Media[]
  onClose: () => void
}

/**
 * Full-viewport cinematic asset viewer.
 * – Desktop: media stage (flex-1) + collapsible metadata panel (384px)
 * – Mobile:  media stage (full) + bottom sheet drawer
 */
export const AssetViewer: React.FC<AssetViewerProps> = ({ media, mediaList, onClose }) => {
  const router = useRouter()
  const overlayRef = useRef<HTMLDivElement>(null)
  const savedFocusRef = useRef<Element | null>(null)

  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Responsive breakpoint: md+ = desktop layout
  const [isDesktop, setIsDesktop] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    setIsDesktop(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // ── Navigation ────────────────────────────────────────────────────────────
  const { currentMedia, currentIndex, totalCount, goNext, goPrev, canNavigate } =
    useAssetNavigation(mediaList, media)

  // ── Keyboard ──────────────────────────────────────────────────────────────
  useViewerKeyboard({
    enabled: !!media,
    onClose,
    onPrev: goPrev,
    onNext: goNext,
  })

  // ── Focus management ──────────────────────────────────────────────────────
  useEffect(() => {
    if (media) {
      savedFocusRef.current = document.activeElement
      // Focus the dialog after the animation frame
      requestAnimationFrame(() => overlayRef.current?.focus())
      // Prevent body scroll while viewer is open
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      if (savedFocusRef.current instanceof HTMLElement) {
        savedFocusRef.current.focus()
      }
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [!!media]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mobile swipe-to-navigate ──────────────────────────────────────────────
  const swipeStartX = useRef<number | null>(null)
  const handleTouchStart = (e: React.TouchEvent) => {
    swipeStartX.current = e.touches[0].clientX
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (swipeStartX.current === null) return
    const dx = e.changedTouches[0].clientX - swipeStartX.current
    if (Math.abs(dx) > 50 && canNavigate) {
      if (dx < 0) goNext()
      else goPrev()
    }
    swipeStartX.current = null
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleConfirmDelete = useCallback(async () => {
    if (!currentMedia) return
    setIsDeleting(true)
    try {
      const result = await deleteMediaAction(currentMedia.id)
      if (result.success) {
        toast.success('Asset deleted')
        setIsDeleteOpen(false)
        onClose()
        router.refresh()
      } else {
        toast.error(result.message || 'Delete failed')
      }
    } catch {
      toast.error('Unexpected error during deletion')
    } finally {
      setIsDeleting(false)
    }
  }, [currentMedia, onClose, router])

  // ── Background click to close ─────────────────────────────────────────────
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <>
      <AnimatePresence>
        {media && (
          <motion.div
            key="asset-viewer-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[200] bg-black/88 backdrop-blur-sm"
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-label="Asset viewer"
            ref={overlayRef}
            tabIndex={-1}
          >
            {/* ── Live region for screen readers ──────────────────── */}
            <div aria-live="polite" aria-atomic="true" className="sr-only">
              {currentMedia
                ? `Asset ${currentIndex + 1} of ${totalCount}: ${currentMedia.title || currentMedia.filename || 'Untitled'}`
                : ''}
            </div>

            {/* ── Main content area ──────────────────────────────────── */}
            {currentMedia && (
              // Persistent layout wrapper — never keyed, never exits.
              // Only the stage (image) animates on asset switch; the
              // metadata panel stays mounted and cross-fades its content.
              <div
                className={
                  isDesktop
                    ? 'absolute inset-0 flex overflow-hidden'
                    : 'absolute inset-0 flex flex-col overflow-hidden'
                }
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                {/* ── Media Stage — animates on asset switch ───────── */}
                <div className={isDesktop ? 'flex-1 min-w-0 relative' : 'flex-1 min-h-0 relative'}>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentMedia.id}
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
                      className="absolute inset-0"
                    >
                      <MediaStage media={currentMedia} onClose={onClose} hasSidePanel={isDesktop} />
                    </motion.div>
                  </AnimatePresence>

                  {/* ── Persistent chrome — never animates ────────────── */}
                  {/* Close button */}
                  <button
                    aria-label="Close viewer"
                    onClick={(e) => {
                      e.stopPropagation()
                      onClose()
                    }}
                    className="absolute top-4 right-4 z-30 flex items-center justify-center w-9 h-9 rounded-[18px] bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white/80 hover:text-white transition-all"
                  >
                    <CloseIcon size={18} />
                  </button>

                  {/* Nav controls */}
                  {canNavigate && (
                    <NavControls
                      onPrev={goPrev}
                      onNext={goNext}
                      currentIndex={currentIndex}
                      totalCount={totalCount}
                    />
                  )}

                  {/* Action bar */}
                  <div
                    className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ActionBar media={currentMedia} onDeleteRequest={() => setIsDeleteOpen(true)} />
                  </div>
                </div>

                {/* ── Desktop: Metadata Panel — persistent, content fades ── */}
                {isDesktop && <MetadataPanel media={currentMedia} isDesktop={true} />}

                {/* ── Mobile: Peek-strip layout slot — persistent ──────── */}
                {/* overflow-visible lets the sheet expand upward over stage */}
                {!isDesktop && (
                  <div
                    className="relative shrink-0 overflow-visible"
                    style={{ height: PEEK_HEIGHT }}
                  >
                    <MetadataPanel media={currentMedia} isDesktop={false} />
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete confirmation modal ────────────────────────────── */}
      <SafetyLockDeleteModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        count={1}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </>
  )
}
