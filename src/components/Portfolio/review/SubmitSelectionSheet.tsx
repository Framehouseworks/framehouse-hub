'use client'

import React, { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Send, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useReviewMode } from './ReviewModeProvider'

interface Props {
  open: boolean
  onClose: () => void
}

export function SubmitSelectionSheet({ open, onClose }: Props) {
  const review = useReviewMode()
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const MAX_NOTE = 1000

  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 100)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [open, onClose])

  if (!review) return null

  const selectedIds = Array.from(review.selections.values())

  async function handleSubmit() {
    if (!review) return
    setSubmitting(true)
    try {
      const res = await fetch(
        `/api/portfolio-review/${review.config.portfolioSlug}/submit`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientNote: note }),
        },
      )
      const data = await res.json()

      if (!res.ok) {
        if (data.error === 'IDENTIFICATION_REQUIRED') {
          review.requestIdentification('submit')
          onClose()
          return
        }
        if (data.error === 'UNAVAILABLE_ITEMS') {
          toast.error('Some assets are no longer in this portfolio and were removed from your selection.')
        } else if (data.error === 'PORTFOLIO_UNAVAILABLE') {
          toast.error('This portfolio is no longer available.')
          onClose()
          return
        } else {
          toast.error('Could not submit. Please try again.')
        }
        setSubmitting(false)
        return
      }

      const ids = selectedIds.map((s) => s.mediaId)
      const successMsg = data.alreadySubmitted
        ? 'Already submitted ✓'
        : review.config.ownerName
          ? `Sent to ${review.config.ownerName} ✓`
          : 'Submitted ✓'
      review.markSubmitted(ids, successMsg)

      if (data.alreadySubmitted) {
        toast.success('Your selection was already submitted.')
      } else {
        toast.success(
          review.config.ownerName
            ? `Selection sent to ${review.config.ownerName} ✓`
            : 'Your selection has been submitted ✓',
          { duration: 5000 },
        )
      }

      setNote('')
      onClose()
    } catch {
      toast.error('Network error. Please check your connection.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/60"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Sheet */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Submit your selection"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[120] rounded-t-[24px] max-h-[85vh] overflow-y-auto"
            style={{ background: '#111111', paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            <div className="px-5 py-4 flex flex-col gap-5">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-white text-base font-semibold">Submit selection</h2>
                  <p className="text-white/40 text-xs mt-0.5">
                    {selectedIds.length} {selectedIds.length === 1 ? 'asset' : 'assets'} selected
                    {review.config.ownerName ? ` · Will be sent to ${review.config.ownerName}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/8 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Optional note */}
              <div>
                <label
                  htmlFor="client-note"
                  className="block text-white/40 text-[10px] uppercase tracking-[0.2em] mb-2"
                  style={{ fontFamily: "'Rubik Mono One', monospace" }}
                >
                  Note (optional)
                </label>
                <textarea
                  id="client-note"
                  ref={textareaRef}
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, MAX_NOTE))}
                  placeholder="Add a message to the creative…"
                  rows={3}
                  className="w-full bg-white/6 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/25 border border-transparent focus:border-[#d79922]/40 focus:outline-none resize-none"
                />
                <div className="text-right text-[10px] text-white/25 mt-1">
                  {note.length}/{MAX_NOTE}
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full h-12 rounded-[24px] flex items-center justify-center gap-2 text-sm text-[#1a1c1c] font-medium transition-opacity disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d79922]"
                style={{ background: 'linear-gradient(135deg, #d79922, #7f5700)' }}
                aria-label={`Submit ${selectedIds.length} ${selectedIds.length === 1 ? 'asset' : 'assets'} for review`}
              >
                {submitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <Send size={15} />
                    Submit {selectedIds.length} {selectedIds.length === 1 ? 'asset' : 'assets'}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
