'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useUpload } from '@/providers/UploadProvider'
import { FileText, X, Tag, FilePlus } from 'lucide-react'

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
  files: File[]
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, files }) => {
  const { addFiles } = useUpload()
  const [batchTags, setBatchTags] = useState('')
  const [currentFiles, setCurrentFiles] = useState<File[]>([])

  useEffect(() => {
    if (isOpen) {
      setCurrentFiles(files)
      setBatchTags('')
    }
  }, [isOpen, files])

  useEffect(() => {
    if (isOpen && currentFiles.length === 0) {
      onClose()
    }
  }, [currentFiles.length, isOpen, onClose])

  const handleRemove = (idx: number) => {
    setCurrentFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleStartIngestion = () => {
    if (currentFiles.length === 0) return

    const tags = batchTags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0)

    addFiles(currentFiles, { tags })
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-white dark:bg-[#0a0c10] border-black/[0.05] dark:border-white/[0.05] rounded-[32px] p-8 shadow-2xl overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gallery-gold/0 via-gallery-gold to-gallery-gold/0 opacity-50" />

        <DialogHeader className="mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gallery-gold/10 flex items-center justify-center text-gallery-gold mb-4">
            <FilePlus size={24} />
          </div>
          <DialogTitle className="text-2xl font-semibold tracking-tight text-primary">
            Review Ingestion
          </DialogTitle>
          <DialogDescription className="text-on-surface/40 font-varela">
            Initialize archival sequence for {currentFiles.length} item
            {currentFiles.length !== 1 ? 's' : ''}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Preview List */}
          <div className="space-y-3">
            <label className="font-rubik text-[10px] tracking-wider text-on-surface/40 uppercase flex items-center gap-2">
              <FileText size={12} />
              Staged for Source of Truth
            </label>
            <div className="max-h-[220px] overflow-y-auto pr-2 space-y-2 scrollbar-hide custom-scrollbar">
              {currentFiles.map((file, idx) => (
                <div
                  key={`${file.name}-${idx}`}
                  className="group flex items-center gap-3 p-3 rounded-xl bg-gallery-surface/50 dark:bg-white/[0.02] border border-black/[0.02] dark:border-white/[0.02] hover:border-gallery-gold/20 transition-all duration-300"
                >
                  <div className="w-8 h-8 rounded-lg bg-white dark:bg-white/5 flex items-center justify-center text-on-surface/30 group-hover:text-gallery-gold transition-colors">
                    <FileText size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-primary truncate">{file.name}</p>
                    <p className="text-[10px] text-on-surface/30 tabular-nums">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemove(idx)}
                    className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-500 text-on-surface/30 transition-all"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Batch Metadata */}
          <div className="space-y-3">
            <label className="font-rubik text-[10px] tracking-wider text-on-surface/40 uppercase flex items-center gap-2">
              <Tag size={12} />
              Archival Classification
            </label>
            <Input
              placeholder="e.g. Iceland, 2024, Wildlife"
              value={batchTags}
              onChange={(e) => setBatchTags(e.target.value)}
              className="h-12 rounded-2xl bg-gallery-surface/50 dark:bg-white/[0.02] border-black/[0.03] dark:border-white/[0.03] focus:ring-1 focus:ring-gallery-gold/30 text-sm px-4"
            />
            <p className="text-[10px] text-on-surface/30 italic font-varela">
              Separate tags with commas. These will be indexed for instant retrieval.
            </p>
          </div>
        </div>

        <DialogFooter className="mt-8 flex-row sm:justify-between gap-4">
          <Button
            variant="ghost"
            onClick={onClose}
            className="rounded-full px-6 text-on-surface/60 hover:text-primary transition-colors"
          >
            Cancel
          </Button>
          <Button
            variant="gallery"
            onClick={handleStartIngestion}
            disabled={currentFiles.length === 0}
            className="rounded-full px-10 h-12 shadow-lg shadow-gallery-gold/10"
          >
            Start Ingestion
          </Button>
        </DialogFooter>
      </DialogContent>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(127, 87, 0, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb {
          background: rgba(127, 87, 0, 0.2);
        }
      `}</style>
    </Dialog>
  )
}
