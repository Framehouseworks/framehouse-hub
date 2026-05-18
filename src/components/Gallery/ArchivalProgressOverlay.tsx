'use client'

import React, { useMemo } from 'react'
import { useUpload } from '@/providers/UploadProvider'
import { motion, AnimatePresence } from 'framer-motion'
import { CloudUpload, CheckCircle2, AlertCircle, Loader2, X, RefreshCcw } from 'lucide-react'
import { Progress } from '@/components/ui/progress'

export const ArchivalProgressOverlay: React.FC = () => {
  const { queue, cancelUpload, clearQueue, retryFailed, retryItem } = useUpload()

  const activeItems = useMemo(
    () => queue.filter((item) => item.status === 'uploading' || item.status === 'pending'),
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
    const total = queue.reduce((acc, item) => acc + item.progress, 0)
    return Math.round(total / queue.length)
  }, [queue])

  const isFinished = queue.length > 0 && activeItems.length === 0

  if (queue.length === 0) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-8 right-8 z-[100] w-[380px]"
      >
        <div className="bg-white dark:bg-[#0a0c10] border border-black/5 dark:border-white/10 rounded-[24px] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.2)] overflow-hidden">
          {/* Progress Header */}
          <div className="p-5 border-b border-black/[0.03] dark:border-white/[0.03] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-xl">
                {isFinished ? (
                  <CheckCircle2 className="text-primary" size={18} />
                ) : (
                  <CloudUpload className="text-primary animate-pulse" size={18} />
                )}
              </div>
              <div>
                <h3 className="font-inter text-sm font-semibold text-primary">
                  {isFinished ? 'Archival Complete' : 'Ingesting Archives...'}
                </h3>
                <p className="font-space-mono text-[9px] font-bold text-on-surface/30 uppercase tracking-wider">
                  {completedCount} / {queue.length} Committed
                </p>
              </div>
            </div>
            {isFinished && (
              <button
                onClick={clearQueue}
                className="text-on-surface/20 hover:text-primary transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Progress Bar & Stats */}
          <div className="p-5 space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-space-mono text-[9px] font-bold text-on-surface/40 uppercase">
                  Network Throughput
                </span>
                <span className="font-rubik text-[10px] text-primary">
                  {totalProgress}% Complete
                </span>
              </div>
              <Progress
                value={totalProgress}
                className="h-1.5 bg-black/[0.03] dark:bg-white/[0.03]"
              />
            </div>

            {/* Queue Item Preview (Last 3) */}
            <div className="space-y-2">
              {queue
                .slice(-3)
                .reverse()
                .map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between group p-2 rounded-xl hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center flex-shrink-0">
                        {item.status === 'uploading' ? (
                          <Loader2 className="animate-spin text-primary" size={14} />
                        ) : item.status === 'ready' ? (
                          <CheckCircle2 className="text-green-500" size={14} />
                        ) : item.status === 'failed' ? (
                          <AlertCircle className="text-red-500" size={14} />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-on-surface/20" />
                        )}
                      </div>
                      <span className="font-inter text-[11px] text-primary truncate max-w-[180px]">
                        {item.file.name}
                      </span>
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
                ))}
            </div>

            {failedCount > 0 && (
              <div className="pt-2">
                <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 p-3 rounded-xl flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="text-red-500" size={14} />
                    <p className="font-inter text-[10px] text-red-600 dark:text-red-400 font-medium">
                      {failedCount} assets failed forensic extraction.
                    </p>
                  </div>
                  <button
                    onClick={retryFailed}
                    className="h-7 px-3 rounded-lg bg-red-500 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-red-600 transition-all flex items-center gap-2"
                  >
                    <RefreshCcw size={12} />
                    Retry All
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer Telemetry */}
          {!isFinished && (
            <div className="px-5 py-3 bg-black/[0.01] dark:bg-white/[0.01] border-t border-black/[0.02] dark:border-white/[0.02]">
              <div className="flex justify-between items-center">
                <p className="font-space-mono text-[8px] font-bold text-on-surface/20 uppercase tracking-widest">
                  Archival Stream Active
                </p>
                <div className="flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                  <span className="font-rubik text-[9px] text-primary/40 uppercase">
                    GCP Node: 01A
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
