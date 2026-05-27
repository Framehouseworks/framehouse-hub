'use client'

import React, { useMemo } from 'react'
import { useUpload } from '@/providers/UploadProvider'
import { computeEffectiveProgress } from '@/providers/UploadProvider'
import type { UploadItem } from '@/providers/UploadProvider'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CloudUpload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  RefreshCcw,
  ImagePlus,
  ScanSearch,
  PackageCheck,
  ChevronDown,
  ChevronUp,
  type LucideIcon,
} from 'lucide-react'

const STEP_DISPLAY: Record<string, { label: string; icon: LucideIcon }> = {
  upload_complete: { label: 'Upload complete', icon: CloudUpload },
  exif_parsing: { label: 'Reading metadata', icon: ScanSearch },
  generating_webp: { label: 'Generating previews', icon: ImagePlus },
  registering_assets: { label: 'Finalizing', icon: PackageCheck },
  ready: { label: 'Done', icon: CheckCircle2 },
  failed: { label: 'Failed', icon: AlertCircle },
}

function getProcessingStage(item: UploadItem) {
  if (item.status !== 'processing') return null
  const step = item.processingStep || 'upload_complete'
  return STEP_DISPLAY[step] || STEP_DISPLAY.upload_complete
}

export const ArchivalProgressOverlay: React.FC = () => {
  const { queue, cancelUpload, clearQueue, retryFailed, retryItem } = useUpload()
  const [isExpanded, setIsExpanded] = React.useState(true)

  const activeItems = useMemo(
    () =>
      queue.filter(
        (item) =>
          item.status === 'uploading' || item.status === 'pending' || item.status === 'processing',
      ),
    [queue],
  )

  const completedCount = useMemo(
    () => queue.filter((item) => item.status === 'ready').length,
    [queue],
  )

  const failedCount = useMemo(
    () => queue.filter((item) => item.status === 'failed').length,
    [queue],
  )

  const totalProgress = useMemo(() => {
    if (queue.length === 0) return 0
    const total = queue.reduce((acc, item) => acc + computeEffectiveProgress(item), 0)
    return Math.round(total / queue.length)
  }, [queue])

  const isFinished = queue.length > 0 && activeItems.length === 0

  const headerLabel = isFinished
    ? 'Upload Complete'
    : activeItems.some((i) => i.status === 'processing')
      ? 'Processing…'
      : 'Uploading…'

  const headerIcon = isFinished ? CheckCircle2 : CloudUpload

  const HeaderIcon = headerIcon

  if (queue.length === 0) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-8 right-8 z-40 w-[380px]"
      >
        <div className="bg-white/95 dark:bg-[#0a0c10]/95 backdrop-blur-2xl rounded-[24px] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.15)] overflow-hidden">
          {/* Header */}
          <div className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gallery-gold/10 p-2.5 rounded-2xl">
                {isFinished ? (
                  <HeaderIcon className="text-emerald-500" size={18} />
                ) : (
                  <HeaderIcon className="text-gallery-gold animate-pulse" size={18} />
                )}
              </div>
              <div>
                <h3 className="font-inter text-sm font-semibold text-primary">{headerLabel}</h3>
                <p className="font-rubik text-[9px] text-on-surface/30 uppercase tracking-wider">
                  {completedCount} / {queue.length} Committed
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsExpanded((v) => !v)}
                aria-label={isExpanded ? 'Collapse processing panel' : 'Expand processing panel'}
                aria-expanded={isExpanded}
                className="text-on-surface/30 hover:text-primary transition-colors p-1 rounded-xl hover:bg-black/[0.03]"
              >
                {isExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              </button>
              {(isFinished || totalProgress >= 100) && (
                <button
                  onClick={clearQueue}
                  aria-label="Dismiss"
                  className="text-on-surface/20 hover:text-primary transition-colors p-1 rounded-xl hover:bg-black/[0.03]"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          <AnimatePresence initial={false}>
            {isExpanded && (
              <motion.div
                key="body"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="overflow-hidden"
              >
                {/* Progress Track */}
                <div className="px-5 pb-2">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-rubik text-[8px] text-on-surface/30 uppercase tracking-widest">
                      Pipeline Progress
                    </span>
                    <span className="font-rubik text-[10px] text-gallery-gold font-semibold">
                      {totalProgress}%
                    </span>
                  </div>
                  <div className="h-1 bg-black/[0.04] dark:bg-white/[0.04] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        background: isFinished
                          ? 'rgb(16, 185, 129)'
                          : 'linear-gradient(90deg, #d79922, #7f5700)',
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${totalProgress}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                  </div>
                </div>

                {/* Queue Items */}
                <div className="px-3 py-2 max-h-[280px] overflow-y-auto space-y-0.5 custom-scrollbar">
                  {[...queue].reverse().map((item) => {
                    const stage = getProcessingStage(item)
                    const StageIcon = stage?.icon
                    const itemProgress = computeEffectiveProgress(item)

                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between group p-2.5 rounded-2xl hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative w-8 h-8 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] flex items-center justify-center flex-shrink-0">
                            {item.status === 'uploading' ? (
                              <Loader2 className="animate-spin text-gallery-gold" size={14} />
                            ) : item.status === 'processing' && StageIcon ? (
                              <StageIcon className="animate-pulse text-amber-500" size={14} />
                            ) : item.status === 'ready' ? (
                              <CheckCircle2 className="text-emerald-500" size={14} />
                            ) : item.status === 'failed' ? (
                              <AlertCircle className="text-red-500" size={14} />
                            ) : (
                              <div className="w-1.5 h-1.5 rounded-full bg-on-surface/20" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-inter text-[11px] text-primary truncate max-w-[140px] block">
                                {item.filename || item.file?.name || 'Unknown asset'}
                              </span>
                              <span className="font-rubik text-[8px] text-on-surface/25 tabular-nums flex-shrink-0">
                                {itemProgress}%
                              </span>
                            </div>
                            {item.status === 'processing' && stage && (
                              <span className="font-rubik text-[8px] text-amber-500/80 uppercase tracking-wider">
                                {stage.label}
                              </span>
                            )}
                            {item.status === 'uploading' && (
                              <span className="font-rubik text-[8px] text-gallery-gold/60 uppercase tracking-wider">
                                Uploading...
                              </span>
                            )}
                          </div>
                        </div>

                        {item.status === 'pending' && (
                          <button
                            onClick={() => cancelUpload(item.id)}
                            className="opacity-0 group-hover:opacity-100 text-on-surface/20 hover:text-red-500 transition-all p-1"
                          >
                            <X size={12} />
                          </button>
                        )}

                        {item.status === 'failed' && (
                          <button
                            onClick={() => retryItem(item.id)}
                            className="text-[9px] text-red-500 font-medium hover:underline flex items-center gap-1"
                          >
                            <RefreshCcw size={10} />
                            Retry
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>

                {failedCount > 0 && (
                  <div className="px-5 pb-4">
                    <div className="bg-red-50 dark:bg-red-900/10 p-3 rounded-2xl flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="text-red-500" size={14} />
                        <p className="font-inter text-[10px] text-red-600 dark:text-red-400 font-medium">
                          {failedCount} asset{failedCount > 1 ? 's' : ''} failed extraction.
                        </p>
                      </div>
                      <button
                        onClick={retryFailed}
                        className="h-7 px-3 rounded-xl bg-red-500 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-red-600 transition-all flex items-center gap-2"
                      >
                        <RefreshCcw size={12} />
                        Retry All
                      </button>
                    </div>
                  </div>
                )}

              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
