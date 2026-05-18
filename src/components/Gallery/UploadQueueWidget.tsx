'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUpload } from '@/providers/UploadProvider'
import {
  CheckCircle2,
  CircleDashed,
  AlertCircle,
  X,
  ChevronUp,
  ChevronDown,
  Tag,
} from 'lucide-react'

export const UploadQueueWidget: React.FC = () => {
  const { queue, cancelUpload } = useUpload()
  const [isExpanded, setIsExpanded] = React.useState(true)

  const activeItems = queue.filter((item) => item.status !== 'ready' && item.status !== 'failed')
  const completedItems = queue.filter((item) => item.status === 'ready' || item.status === 'failed')

  if (queue.length === 0) return null

  return (
    <div className="fixed bottom-8 right-8 z-[100] w-80">
      <AnimatePresence>
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          className="bg-white/90 dark:bg-[#0a0c10]/90 border border-black/[0.05] dark:border-white/[0.05] rounded-[24px] shadow-[0px_20px_50px_rgba(0,0,0,0.1)] overflow-hidden backdrop-blur-2xl"
        >
          {/* Header */}
          <div
            className="p-4 flex items-center justify-between cursor-pointer hover:bg-gallery-surface/30 transition-colors"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gallery-gold/10 flex items-center justify-center text-gallery-gold">
                {activeItems.length > 0 ? (
                  <CircleDashed size={14} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={14} />
                )}
              </div>
              <div>
                <h4 className="text-[11px] font-rubik font-bold tracking-wider uppercase text-primary">
                  {activeItems.length > 0 ? 'Archival Ingestion' : 'Archive Ready'}
                </h4>
                <p className="text-[9px] text-on-surface/40 tabular-nums uppercase tracking-widest font-medium">
                  {completedItems.length} / {queue.length} &bull; Processed
                </p>
              </div>
            </div>
            <button className="text-on-surface/30 hover:text-primary transition-colors">
              {isExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </button>
          </div>

          {/* List */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="overflow-hidden border-t border-black/[0.03] dark:border-white/[0.03]"
              >
                <div className="max-h-[300px] overflow-y-auto p-2 space-y-1 custom-scrollbar">
                  {queue.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-gallery-surface/30 transition-colors group relative"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-medium text-primary truncate pr-4">
                            {item.file.name}
                          </span>
                          <span className="text-[9px] tabular-nums text-on-surface/30 font-varela">
                            {item.status === 'ready' ? '100%' : `${item.progress}%`}
                          </span>
                        </div>

                        {/* Meta/Tags Row */}
                        {(item.metadata?.tags?.length || 0) > 0 && (
                          <div className="flex items-center gap-1.5 mb-2 overflow-hidden">
                            <Tag size={8} className="text-gallery-gold shrink-0" />
                            <div className="flex gap-1 overflow-hidden">
                              {item.metadata?.tags?.slice(0, 2).map((tag, i) => (
                                <span
                                  key={i}
                                  className="text-[8px] text-on-surface/40 whitespace-nowrap truncate"
                                >
                                  {tag}
                                  {i === 0 && (item.metadata?.tags?.length || 0) > 1 ? ',' : ''}
                                </span>
                              ))}
                              {(item.metadata?.tags?.length || 0) > 2 && (
                                <span className="text-[8px] text-on-surface/40">
                                  +{item.metadata!.tags!.length - 2}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Progress Bar */}
                        <div className="h-[2px] w-full bg-black/[0.03] dark:bg-white/[0.03] rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{
                              width: item.status === 'ready' ? '100%' : `${item.progress}%`,
                              backgroundColor:
                                item.status === 'failed' ? '#ef4444' : 'var(--gallery-gold)',
                            }}
                            className="h-full bg-gallery-gold"
                            transition={{ duration: 0.5 }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {item.status === 'ready' && (
                          <CheckCircle2 size={12} className="text-green-500" />
                        )}
                        {item.status === 'failed' && (
                          <AlertCircle size={12} className="text-red-500" />
                        )}
                        {(item.status === 'pending' || item.status === 'uploading') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              cancelUpload(item.id)
                            }}
                            className="opacity-0 group-hover:opacity-100 text-on-surface/30 hover:text-red-500 transition-all"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
