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
import { Label } from '@/components/ui/label'
import { Sparkles, Tag, Folder, Camera, Map as MapIcon } from 'lucide-react'
import { cn } from '@/utilities/cn'

interface SaveViewModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: { name: string; icon: string }) => Promise<void>
}

const ICONS = [
  { id: 'sparkles', icon: Sparkles, label: 'Intelligent' },
  { id: 'tag', icon: Tag, label: 'Tag-based' },
  { id: 'folder', icon: Folder, label: 'Project' },
  { id: 'camera', icon: Camera, label: 'Technical' },
  { id: 'map', icon: MapIcon, label: 'Location' },
]

export const SaveViewModal: React.FC<SaveViewModalProps> = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('')
  const [selectedIcon, setSelectedIcon] = useState('sparkles')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleConfirm = async () => {
    if (!name.trim()) return
    setIsSubmitting(true)
    try {
      await onSave({ name, icon: selectedIcon })
      setName('')
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] bg-white/95 dark:bg-[#0a0c10]/95 backdrop-blur-2xl border-black/[0.05] dark:border-white/[0.1] rounded-[32px] p-8 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)]">
        <DialogHeader>
          <div className="w-12 h-12 rounded-2xl bg-gallery-gold/10 flex items-center justify-center mb-4">
            <Sparkles className="text-gallery-gold" size={24} />
          </div>
          <DialogTitle className="text-2xl font-semibold tracking-tight text-primary font-rubik">
            Save Smart Collection
          </DialogTitle>
          <DialogDescription className="text-sm text-on-surface/40 font-varela leading-relaxed mt-2">
            Formalize this filtered view as a dynamic collection. It will appear in your explorer as
            a live, intelligent stage.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-8 py-6">
          <div className="space-y-3">
            <Label
              htmlFor="name"
              className="text-[10px] font-bold uppercase tracking-widest text-gallery-gold ml-1"
            >
              Collection Name
            </Label>
            <Input
              id="name"
              placeholder="e.g., Summer Shoots 2024"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 bg-black/[0.03] dark:bg-white/[0.03] border-black/[0.05] dark:border-white/[0.05] rounded-2xl focus:ring-gallery-gold/20 focus:border-gallery-gold/30 transition-all font-varela"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-on-surface/30 ml-1">
              Representational Icon
            </Label>
            <div className="grid grid-cols-5 gap-3">
              {ICONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedIcon(item.id)}
                  className={cn(
                    'h-14 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1 group',
                    selectedIcon === item.id
                      ? 'bg-gallery-gold/5 border-gallery-gold/30 text-gallery-gold'
                      : 'bg-black/[0.02] dark:bg-white/[0.02] border-black/[0.05] dark:border-white/[0.05] text-on-surface/20 hover:border-black/10 dark:hover:border-white/10',
                  )}
                >
                  <item.icon
                    size={18}
                    className={cn(
                      'transition-all',
                      selectedIcon === item.id ? 'scale-110' : 'group-hover:text-on-surface/40',
                    )}
                  />
                  <span className="text-[8px] font-bold uppercase tracking-tighter opacity-60">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-3 sm:justify-start pt-4 border-t border-black/[0.05] dark:border-white/[0.05]">
          <Button
            variant="gallery"
            onClick={handleConfirm}
            disabled={!name.trim() || isSubmitting}
            className="flex-1 h-12 rounded-2xl font-semibold shadow-lg shadow-gallery-gold/10"
          >
            {isSubmitting ? 'Saving...' : 'Establish Collection'}
          </Button>
          <Button
            variant="ghost"
            onClick={onClose}
            className="h-12 px-6 rounded-2xl text-on-surface/40 hover:text-primary transition-all font-varela"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
