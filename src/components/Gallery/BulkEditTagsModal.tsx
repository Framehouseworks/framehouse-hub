'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/utilities/cn'
import { Tag as TagIcon, X as CloseIcon, Plus, Save, RotateCcw, Info } from 'lucide-react'
import { bulkUpdateTagsAction } from '@/app/(dashboard)/actions/media'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface BulkEditTagsModalProps {
  selectedIds: (string | number)[]
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export const BulkEditTagsModal: React.FC<BulkEditTagsModalProps> = ({
  selectedIds,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [mode, setMode] = useState<'append' | 'replace'>('append')
  const [isSaving, setIsSaving] = useState(false)
  const router = useRouter()

  const handleAddTag = () => {
    if (tagInput && tagInput.trim()) {
      const newTag = tagInput.trim().toLowerCase()
      if (!tags.includes(newTag)) {
        setTags([...tags, newTag])
      }
      setTagInput('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove))
  }

  const handleSave = async () => {
    if (tags.length === 0 && mode === 'append') {
      toast.error('Please add at least one tag to append.')
      return
    }

    setIsSaving(true)
    try {
      const result = await bulkUpdateTagsAction(selectedIds, tags, mode)
      if (result.success) {
        toast.success(`Batch update successful: ${result.message}`)
        onSuccess()
        router.refresh()
        onClose()
      } else {
        toast.error(result.message || 'Failed to update tags')
      }
    } catch (_error) {
      toast.error('An unexpected error occurred during batch update')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[500px] p-0 overflow-hidden bg-white dark:bg-[#0a0c10] border-none rounded-[32px] shadow-2xl outline-none">
        <DialogHeader className="p-8 pb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-6 px-3 rounded-full bg-gallery-gold/10 text-gallery-gold border border-gallery-gold/20 flex items-center justify-center leading-none">
              <span className="text-[9px] font-bold tracking-widest uppercase font-rubik mt-[1px]">
                Batch Management
              </span>
            </div>
            <span className="text-[10px] text-on-surface/40 uppercase tracking-widest font-varela">
              {selectedIds.length} Assets Selected
            </span>
          </div>
          <DialogTitle className="text-2xl font-semibold tracking-tight text-primary">
            Mass Classification
          </DialogTitle>
          <DialogDescription className="text-sm text-on-surface/40 font-varela mt-1">
            Apply archival labels across your selection with surgical precision.
          </DialogDescription>
        </DialogHeader>

        <div className="p-8 pt-4 space-y-8">
          {/* Mode Selection */}
          <section className="space-y-4">
            <label className="text-[10px] font-bold tracking-widest text-on-surface/30 uppercase flex items-center gap-2">
              <Info size={12} className="text-gallery-gold" />
              Operation Mode
            </label>
            <div className="grid grid-cols-2 gap-3 p-1.5 bg-black/[0.03] dark:bg-white/[0.03] rounded-2xl">
              <button
                onClick={() => setMode('append')}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 py-4 rounded-xl transition-all duration-300',
                  mode === 'append'
                    ? 'bg-white dark:bg-white/10 shadow-sm text-primary'
                    : 'text-on-surface/40 hover:text-on-surface/60',
                )}
              >
                <span className="text-[11px] font-bold uppercase tracking-wider">Append</span>
                <span className="text-[9px] font-medium opacity-60">Merge with existing</span>
              </button>
              <button
                onClick={() => setMode('replace')}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 py-4 rounded-xl transition-all duration-300',
                  mode === 'replace'
                    ? 'bg-white dark:bg-white/10 shadow-sm text-primary'
                    : 'text-on-surface/40 hover:text-on-surface/60',
                )}
              >
                <span className="text-[11px] font-bold uppercase tracking-wider">Replace</span>
                <span className="text-[9px] font-medium opacity-60">Overwrite all tags</span>
              </button>
            </div>
          </section>

          {/* Tag Interface */}
          <section className="space-y-4">
            <label className="text-[10px] font-bold tracking-widest text-on-surface/30 uppercase flex items-center gap-2">
              <TagIcon size={12} className="text-gallery-gold" />
              Archival Labels
            </label>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 min-h-[40px] p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.03] dark:border-white/[0.03]">
                {tags.length > 0 ? (
                  tags.map((tag, idx) => (
                    <div
                      key={idx}
                      className="h-8 px-4 rounded-xl bg-gallery-surface dark:bg-white/5 border border-black/[0.03] dark:border-white/[0.03] text-[11px] font-medium flex items-center justify-center gap-2"
                    >
                      <span>{tag}</span>
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="text-on-surface/20 hover:text-red-500 transition-colors"
                      >
                        <CloseIcon size={12} />
                      </button>
                    </div>
                  ))
                ) : (
                  <span className="text-[11px] text-on-surface/20 italic mt-1.5 ml-1">
                    No tags staged for batch update...
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Stage new tag..."
                  className="flex-1 bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.05] rounded-xl px-4 h-11 text-sm focus:outline-none focus:ring-1 focus:ring-gallery-gold/50 transition-all"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleAddTag}
                  className="h-11 w-11 rounded-xl border border-dashed border-on-surface/20 text-on-surface/40 hover:text-gallery-gold hover:border-gallery-gold/30"
                >
                  <Plus size={18} />
                </Button>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-8 bg-gallery-surface/30 dark:bg-black/20 border-t border-black/[0.05] dark:border-white/[0.05] flex flex-col gap-3">
          <Button
            className="w-full h-14 rounded-2xl bg-gallery-gold text-white hover:bg-gallery-gold/90 shadow-lg shadow-gallery-gold/20 font-rubik text-xs font-bold uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98]"
            onClick={handleSave}
            disabled={isSaving}
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Processing Batch...' : 'Commit Batch Refinement'}
          </Button>
          <Button
            variant="ghost"
            className="w-full h-14 rounded-2xl text-on-surface/40 hover:text-primary font-rubik text-xs font-bold uppercase tracking-widest transition-all"
            onClick={onClose}
            disabled={isSaving}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Discard Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
