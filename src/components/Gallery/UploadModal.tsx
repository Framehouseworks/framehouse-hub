'use client'

import React, { useState } from 'react'
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
import { FileText } from 'lucide-react'

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
  files: File[]
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, files }) => {
  const { addFiles } = useUpload()
  const [batchTags, setBatchTags] = useState('')

  const handleStartIngestion = () => {
    // In a real scenario, we would attach batchTags to the files
    // or send them as metadata. For the POC, we'll just add the files.
    addFiles(files)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-white dark:bg-black border-black/[0.05] dark:border-white/[0.05] rounded-[32px] p-8">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-2xl font-semibold tracking-tight text-primary">
            Review Ingestion
          </DialogTitle>
          <DialogDescription className="text-on-surface/40">
            You are about to ingest {files.length} items into the Source of Truth.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Preview List */}
          <div className="max-h-[200px] overflow-y-auto pr-2 space-y-2 scrollbar-hide">
            {files.map((file, idx) => (
              <div
                key={`${file.name}-${idx}`}
                className="flex items-center gap-3 p-3 rounded-xl bg-gallery-surface/50 border border-black/[0.02] dark:border-white/[0.02]"
              >
                <FileText size={18} className="text-on-surface/30" />
                <span className="text-xs font-medium text-primary truncate flex-1">
                  {file.name}
                </span>
                <span className="text-[10px] text-on-surface/30 tabular-nums">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
            ))}
          </div>

          {/* Batch Metadata */}
          <div className="space-y-3">
            <label className="font-rubik text-[10px] tracking-wider text-on-surface/40 uppercase">
              Add Archival Tags (Optional)
            </label>
            <Input
              placeholder="e.g. Iceland, 2024, Wildlife"
              value={batchTags}
              onChange={(e) => setBatchTags(e.target.value)}
              className="h-12 rounded-xl bg-gallery-surface/50 border-none focus:ring-1 focus:ring-gallery-gold/30"
            />
            <p className="text-[10px] text-on-surface/30 italic">
              Tags will be applied to all {files.length} items.
            </p>
          </div>
        </div>

        <DialogFooter className="mt-8 flex-row sm:justify-between gap-4">
          <Button
            variant="ghost"
            onClick={onClose}
            className="rounded-full px-6 text-on-surface/60"
          >
            Cancel
          </Button>
          <Button
            variant="gallery"
            onClick={handleStartIngestion}
            className="rounded-full px-10 h-12"
          >
            Start Ingestion
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
