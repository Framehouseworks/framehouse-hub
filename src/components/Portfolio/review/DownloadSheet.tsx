'use client'

import React, { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Download, X, Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { useReviewMode } from './ReviewModeProvider'

interface Props {
  open: boolean
  onClose: () => void
}

export function DownloadSheet({ open, onClose }: Props) {
  const review = useReviewMode()
  const [downloading, setDownloading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (open) {
      setDone(false)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [open, onClose])

  if (!review) return null

  const selections = Array.from(review.selections.values())
  const qualityLabel =
    review.config.downloadQuality === 'original'
      ? 'Full Resolution (original files)'
      : 'Preview Quality (web-optimised)'

  async function handleDownload() {
    if (!review) return
    if (selections.length === 0) {
      toast.error('No assets selected.')
      return
    }

    setDownloading(true)
    try {
      const res = await fetch(
        `/api/portfolio-review/${review.config.portfolioSlug}/download`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ selections: selections.map((s) => s.mediaId) }),
        },
      )

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (data.error === 'SELECTION_TOO_LARGE') {
          toast.error(`Download is limited to ${data.max} assets at a time. Deselect some items.`)
        } else if (data.error === 'RATE_LIMIT_EXCEEDED') {
          toast.error('Download limit reached. You can download up to 3 times per day.')
        } else if (data.error === 'DOWNLOAD_NOT_PERMITTED') {
          toast.error('Downloads are not available for this portfolio.')
        } else {
          toast.error('Download failed. Please try again.')
        }
        setDownloading(false)
        return
      }

      // Trigger browser download
      const blob = await res.blob()
      const filename =
        res.headers.get('content-disposition')?.match(/filename="(.+)"/)?.[1] ??
        `selection_${selections.length}_assets.zip`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)

      setDone(true)
      toast.success(`Download started — ${selections.length} ${selections.length === 1 ? 'asset' : 'assets'}`)
    } catch {
      toast.error('Network error. Please check your connection.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/60"
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Download your selection"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[120] rounded-t-[24px]"
            style={{ background: '#111111', paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            <div className="px-5 py-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-white text-base font-semibold">Download selection</h2>
                  <p className="text-white/40 text-xs mt-0.5">
                    {selections.length} {selections.length === 1 ? 'asset' : 'assets'} · {qualityLabel}
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

              <div
                className="rounded-2xl px-4 py-3 text-xs text-white/40"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              >
                <p>
                  Files will be packaged as a single .zip archive named after this portfolio.
                  {selections.length > 10 && ' Large selections may take a moment to prepare.'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading || done}
                className="w-full h-12 rounded-[24px] flex items-center justify-center gap-2 text-sm text-white font-medium transition-all disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#445aa5]"
                style={{ background: done ? '#1a3a2a' : 'linear-gradient(135deg, #445aa5, #2d3f7a)' }}
                aria-label={`Download ${selections.length} ${selections.length === 1 ? 'asset' : 'assets'} as zip`}
              >
                {downloading ? (
                  <><Loader2 size={16} className="animate-spin" /> Preparing archive…</>
                ) : done ? (
                  <><CheckCircle2 size={16} className="text-emerald-400" /> Download started</>
                ) : (
                  <><Download size={15} /> Download {selections.length} {selections.length === 1 ? 'asset' : 'assets'}</>
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
