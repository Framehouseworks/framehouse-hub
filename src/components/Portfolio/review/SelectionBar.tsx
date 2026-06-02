'use client'

import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Download, Send, X } from 'lucide-react'
import { useReviewMode } from './ReviewModeProvider'
import { SubmitSelectionSheet } from './SubmitSelectionSheet'
import { DownloadSheet } from './DownloadSheet'

export function SelectionBar() {
  const review = useReviewMode()
  const [submitOpen, setSubmitOpen] = useState(false)
  const [downloadOpen, setDownloadOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  React.useEffect(() => { setIsMounted(true) }, [])

  if (!review || !isMounted) return null

  const count = review.selections.size
  const successMsg = review.submissionSuccessMessage
  // Bar stays visible for 4 seconds after submission (shows success message)
  const isOpen = count > 0 || !!successMsg

  function handleSubmitClick() {
    if (!review) return
    if (review.config.requireClientIdentification && !review.isIdentified) {
      review.requestIdentification('submit')
      return
    }
    setSubmitOpen(true)
  }

  const bar = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="toolbar"
          aria-label="Selection actions"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-[100]"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div
            className="mx-4 mb-4 rounded-2xl px-4 py-3 flex items-center justify-between gap-3 shadow-2xl"
            style={{
              background: 'rgba(20, 20, 20, 0.88)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          >
            {/* Count / Success message */}
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              {successMsg ? (
                <span className="text-emerald-400 text-sm font-medium" role="status" aria-live="polite">
                  {successMsg}
                </span>
              ) : (
                <>
                  <span
                    className="px-2.5 py-1 rounded-xl text-[11px] text-[#1a1c1c] flex-shrink-0"
                    style={{
                      background: 'linear-gradient(135deg, #d79922, #7f5700)',
                      fontFamily: "'Rubik Mono One', monospace",
                    }}
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    {count}
                  </span>
                  <span className="text-white/70 text-sm truncate">
                    {count === 1 ? 'asset selected' : 'assets selected'}
                  </span>
                </>
              )}
            </div>

            {/* Actions — hidden during success state */}
            <div className="flex items-center gap-2 flex-shrink-0">{!successMsg && (<>
              {review.config.allowDownload && (
                <button
                  type="button"
                  onClick={() => setDownloadOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] text-white/70 hover:text-white bg-white/8 hover:bg-white/14 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#445aa5]"
                  aria-label="Download selected assets"
                >
                  <Download size={13} />
                  <span className="hidden sm:inline">Download</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleSubmitClick}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] text-[#1a1c1c] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d79922]"
                style={{ background: 'linear-gradient(135deg, #d79922, #7f5700)' }}
                aria-label="Submit selection for creative review"
              >
                <Send size={13} />
                <span className="hidden sm:inline">Submit Selection</span>
                <span className="sm:hidden">Submit</span>
              </button>

              <button
                type="button"
                onClick={review.clearSelections}
                className="flex items-center justify-center w-8 h-8 rounded-xl text-white/30 hover:text-white/60 hover:bg-white/8 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                aria-label="Clear all selections"
              >
                <X size={14} />
              </button>
            </>)}</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return (
    <>
      {createPortal(bar, document.body)}
      <SubmitSelectionSheet open={submitOpen} onClose={() => setSubmitOpen(false)} />
      <DownloadSheet open={downloadOpen} onClose={() => setDownloadOpen(false)} />
    </>
  )
}
