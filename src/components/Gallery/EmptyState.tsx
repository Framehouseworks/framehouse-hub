'use client'

import React from 'react'
import Link from 'next/link'
import { CloudUpload, ShieldCheck, Zap, Search, LayoutGrid, FilePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/utilities/cn'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

const intelligenceItems = [
  {
    icon: Zap,
    title: 'Extraction',
    description: 'Automatic camera metadata & color profile mapping.',
  },
  {
    icon: LayoutGrid,
    title: 'Proxies',
    description: 'Cloud-native preview generation for 4K/RAW masters.',
  },
  {
    icon: ShieldCheck,
    title: 'Organization',
    description: 'AI-driven tagging and visual content classification.',
  },
  {
    icon: Search,
    title: 'Retrieval',
    description: 'Instant cross-collection search via indexed metadata.',
  },
]

const masterFormats = ['RAW', '4K', 'PRORES']
const standardFormats = ['TIFF', 'JPEG', 'PNG', 'MOV', 'MP4']

export const EmptyState: React.FC = () => {
  const [isDragging, setIsDragging] = React.useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      toast.success(`Received ${files.length} archival items. Initializing ingestion...`)
    }
  }

  return (
    <div
      className="flex-1 flex flex-col items-center justify-between gap-8 animate-in fade-in duration-700 slide-in-from-bottom-4"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* 1. The Ingestion Stage (Top Card) */}
      <motion.div
        animate={{
          scale: isDragging ? 0.98 : 1,
          backgroundColor: isDragging
            ? 'var(--gallery-gold-10, hsla(41, 100%, 25%, 0.1))'
            : 'var(--stage-bg, hsla(210, 20%, 98%, 0.4))',
        }}
        style={
          {
            '--stage-bg': 'var(--theme-stage-bg, hsla(210, 20%, 98%, 0.4))',
          } as React.CSSProperties
        }
        className={cn(
          'w-full max-w-5xl rounded-[32px] p-8 md:p-10 relative overflow-hidden group transition-all duration-500 flex flex-col items-center text-center',
          'bg-[var(--stage-bg)] backdrop-blur-[20px] border border-black/[0.03] dark:border-white/[0.03]',
          'dark:bg-[#0a0c10] dark:shadow-[inset_0_0_80px_rgba(127,87,0,0.03)]',
          isDragging
            ? 'shadow-[0px_40px_80px_rgba(127,87,0,0.1)] ring-1 ring-gallery-gold/30'
            : 'shadow-sm',
        )}
      >
        <style jsx>{`
          .dark :global(.dark) {
            --theme-stage-bg: hsla(215, 25%, 8%, 0.8);
          }
        `}</style>

        <AnimatePresence>
          {isDragging && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 bg-gallery-gold/10 flex flex-col items-center justify-center backdrop-blur-[8px]"
            >
              <div className="w-20 h-20 rounded-full bg-gallery-gold flex items-center justify-center text-white shadow-[0px_0px_40px_rgba(127,87,0,0.4)] mb-4">
                <FilePlus size={32} />
              </div>
              <p className="font-rubik text-[10px] tracking-[0.3em] text-gallery-gold uppercase">
                Ingest to Source of Truth
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div
          className={cn(
            'transition-all duration-500 w-full',
            isDragging ? 'blur-xl scale-95 opacity-10' : 'opacity-100',
          )}
        >
          <div className="mb-6 inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white dark:bg-white/5 shadow-sm text-gallery-gold">
            <CloudUpload size={28} strokeWidth={1.5} />
          </div>

          <h2 className="text-2xl font-semibold tracking-tight text-primary mb-3">
            Begin Archival Ingestion
          </h2>
          <p className="text-sm text-on-surface/40 max-w-md mx-auto mb-8 font-varela">
            Drop your master or processed files to initialize the archival sequence. The system will
            automatically map metadata and generate index records.
          </p>

          <div className="flex flex-col items-center gap-8">
            <Button asChild variant="gallery" className="h-12 px-12 text-sm shadow-md">
              <Link href="/dashboard/upload">Upload to Archive</Link>
            </Button>

            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap justify-center gap-2">
                <span className="font-rubik text-[8px] tracking-[0.2em] text-on-surface/30 uppercase mr-2 self-center">
                  Masters
                </span>
                {masterFormats.map((badge) => (
                  <span
                    key={badge}
                    className="px-3 py-1 rounded-md bg-gallery-gold/10 font-rubik text-[9px] tracking-wider text-gallery-gold border border-gallery-gold/10"
                  >
                    {badge}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <span className="font-rubik text-[8px] tracking-[0.2em] text-on-surface/20 uppercase mr-2 self-center">
                  Standard
                </span>
                {standardFormats.map((badge) => (
                  <span
                    key={badge}
                    className="px-3 py-1 rounded-md bg-black/[0.03] dark:bg-white/[0.03] font-rubik text-[9px] tracking-wider text-on-surface/30"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 2. The Intelligence Layer (Bottom Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-5xl mb-4">
        {intelligenceItems.map((item) => (
          <div
            key={item.title}
            className="bg-gallery-surface/40 dark:bg-white/[0.01] p-6 rounded-[24px] border border-black/[0.02] dark:border-white/[0.02] backdrop-blur-md group hover:bg-white dark:hover:bg-white/[0.03] transition-all"
          >
            <div className="w-8 h-8 rounded-lg bg-gallery-gold/5 flex items-center justify-center text-gallery-gold mb-4 group-hover:scale-110 transition-transform">
              <item.icon size={16} strokeWidth={2} />
            </div>
            <h4 className="text-xs font-bold text-primary tracking-tight mb-2 uppercase font-rubik tracking-[0.1em]">
              {item.title}
            </h4>
            <p className="text-[11px] leading-relaxed text-on-surface/40 font-varela">
              {item.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
