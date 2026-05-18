'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { useUpload } from '@/providers/UploadProvider'
import { Plus, LayoutGrid, List } from 'lucide-react'

export const GalleryHeader: React.FC = () => {
  const { openPicker } = useUpload()

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-primary">Creative Archive</h1>
        <p className="text-sm text-on-surface/40 font-varela mt-1">
          Your centralized stage for high-resolution creative work and visual metadata.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex bg-black/[0.03] dark:bg-white/[0.03] p-1 rounded-xl mr-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg bg-white dark:bg-white/10 shadow-sm text-gallery-gold"
          >
            <LayoutGrid size={16} />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-on-surface/40">
            <List size={16} />
          </Button>
        </div>

        <Button
          variant="gallery"
          className="h-10 px-6 rounded-full gap-2 shadow-sm"
          onClick={openPicker}
        >
          <Plus size={18} />
          <span>Ingest New Work</span>
        </Button>
      </div>
    </div>
  )
}
