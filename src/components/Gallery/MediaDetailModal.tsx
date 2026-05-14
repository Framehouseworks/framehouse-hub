'use client'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/utilities/cn'
import type { Media } from '@/payload-types'
import {
  Calendar,
  Camera,
  X as CloseIcon,
  FileText,
  Info,
  MapPin,
  Maximize2,
  Tag as TagIcon,
  Zap,
} from 'lucide-react'
import Image from 'next/image'
import React, { useEffect, useState } from 'react'

interface MediaDetailModalProps {
  media: Media | null
  isOpen: boolean
  onClose: () => void
}

export const MediaDetailModal: React.FC<MediaDetailModalProps> = ({ media, isOpen, onClose }) => {
  const [lastMedia, setLastMedia] = useState<Media | null>(media)

  // Keep a local copy of the media to prevent the modal from 'vanishing'
  // during its exit animation when the parent clears the selection.
  useEffect(() => {
    if (media) {
      setLastMedia(media)
    }
  }, [media])

  // If we have no media to show (initial or cleared and not closing), return null
  if (!media && !lastMedia && !isOpen) return null

  // Use the current media or the last active one for the closing animation
  const activeMedia = media || lastMedia
  if (!activeMedia) return null

  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
  const src = activeMedia.url?.startsWith('http')
    ? activeMedia.url
    : `${serverUrl}${activeMedia.url}`

  const technicalData = [
    { label: 'Camera', value: activeMedia.technical?.cameraModel, icon: Camera },
    { label: 'Lens', value: activeMedia.technical?.lensModel, icon: Info },
    { label: 'ISO', value: activeMedia.technical?.iso, icon: Zap },
    {
      label: 'Aperture',
      value: activeMedia.technical?.aperture ? `f/${activeMedia.technical.aperture}` : null,
      icon: Info,
    },
    {
      label: 'Shutter',
      value: activeMedia.technical?.shutterSpeed ? `${activeMedia.technical.shutterSpeed}s` : null,
      icon: Info,
    },
    {
      label: 'Focal Length',
      value: activeMedia.technical?.focalLength ? `${activeMedia.technical.focalLength}mm` : null,
      icon: Info,
    },
  ].filter((item) => !!item.value)

  const handleExpand = () => {
    window.open(src, '_blank')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          'max-w-[1400px] w-[95vw] h-[90vh] p-0 overflow-hidden bg-white dark:bg-[#0a0c10] border-none rounded-[32px] shadow-2xl flex flex-col md:flex-row outline-none',
          'data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-300',
        )}
      >
        {/* Hidden but accessible header for screen readers */}
        <DialogHeader className="sr-only">
          <DialogTitle>{activeMedia.filename}</DialogTitle>
        </DialogHeader>

        {/* Left: Primary Asset View (Wider flex) */}
        <div className="flex-[2] bg-gallery-surface dark:bg-black/40 relative group overflow-hidden flex items-center justify-center p-12 border-r border-black/[0.03] dark:border-white/[0.03]">
          <div className="relative w-full h-full">
            <Image
              src={src}
              alt={activeMedia.alt || 'Archive Detail'}
              fill
              className="object-contain"
              unoptimized
            />
          </div>
          <div className="absolute bottom-10 right-10 z-20">
            <Button
              variant="outline"
              size="icon"
              onClick={handleExpand}
              className="rounded-full w-12 h-12 bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20 hover:scale-105 transition-all duration-300"
            >
              <Maximize2 size={18} />
            </Button>
          </div>
        </div>

        {/* Right: Metadata Panel (Fixed width) */}
        <div className="w-full md:w-[450px] bg-white dark:bg-[#0a0c10] flex flex-col">
          {/* Header */}
          <div className="p-10 border-b border-black/[0.03] dark:border-white/[0.03]">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-6 px-3 rounded-full bg-gallery-gold/10 text-gallery-gold border border-gallery-gold/20 flex items-center justify-center leading-none">
                <span className="text-[9px] font-bold tracking-widest uppercase font-rubik mt-[1px]">
                  Archival Asset
                </span>
              </div>
              <span className="text-[10px] text-on-surface/40 uppercase tracking-widest font-varela">
                #{activeMedia.id}
              </span>
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-primary break-all leading-tight">
              {activeMedia.filename}
            </h2>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-10 space-y-10 scrollbar-hide custom-scrollbar">
            {/* Technical Pedigree */}
            <section className="space-y-5">
              <label className="text-[10px] font-bold tracking-widest text-on-surface/30 uppercase flex items-center gap-2">
                <Zap size={12} className="text-gallery-gold" />
                Technical Pedigree
              </label>
              <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                {technicalData.map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <span className="text-[9px] text-on-surface/40 uppercase font-rubik tracking-wider">
                      {item.label}
                    </span>
                    <p className="text-sm font-medium text-primary truncate">{item.value}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Classification */}
            <section className="space-y-5">
              <label className="text-[10px] font-bold tracking-widest text-on-surface/30 uppercase flex items-center gap-2">
                <TagIcon size={12} className="text-gallery-gold" />
                Classification
              </label>
              <div className="flex flex-wrap gap-2.5">
                {activeMedia.manualTags?.map((tag, idx) => (
                  <div
                    key={idx}
                    className="h-8 px-4 rounded-xl bg-gallery-surface dark:bg-white/5 border border-black/[0.03] dark:border-white/[0.03] text-[11px] font-medium flex items-center justify-center leading-none"
                  >
                    <span className="mt-[1px]">{tag.tag}</span>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-4 rounded-xl border border-dashed border-on-surface/20 text-[10px] font-bold uppercase tracking-wider hover:bg-gallery-gold/5 hover:border-gallery-gold/30 transition-all"
                >
                  + Add Tag
                </Button>
              </div>
            </section>

            {/* Contextual Data */}
            <section className="space-y-5 pt-6 border-t border-black/[0.03] dark:border-white/[0.03]">
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-3 text-on-surface/40">
                  <Calendar size={14} />
                  <span className="uppercase tracking-wider font-bold text-[9px]">Captured</span>
                </div>
                <span className="font-medium text-primary">
                  {activeMedia.captureDate
                    ? new Date(activeMedia.captureDate).toLocaleDateString(undefined, {
                        dateStyle: 'long',
                      })
                    : 'Unknown'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-3 text-on-surface/40">
                  <FileText size={14} />
                  <span className="uppercase tracking-wider font-bold text-[9px]">Mime Type</span>
                </div>
                <span className="font-medium text-primary">{activeMedia.mimeType}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-3 text-on-surface/40">
                  <Maximize2 size={14} />
                  <span className="uppercase tracking-wider font-bold text-[9px]">Resolution</span>
                </div>
                <span className="font-medium text-primary tabular-nums">
                  {activeMedia.width} &times; {activeMedia.height}
                </span>
              </div>
            </section>

            {/* Location */}
            {activeMedia.location?.address && (
              <section className="space-y-3 pt-6">
                <label className="text-[10px] font-bold tracking-widest text-on-surface/30 uppercase flex items-center gap-2">
                  <MapPin size={12} className="text-gallery-gold" />
                  Archive Origin
                </label>
                <div className="p-4 rounded-2xl bg-gallery-surface/50 dark:bg-white/[0.02] border border-black/[0.02] dark:border-white/[0.02]">
                  <p className="text-xs text-on-surface/60 italic leading-relaxed">
                    {activeMedia.location.address}
                  </p>
                </div>
              </section>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-10 bg-gallery-surface/30 dark:bg-black/20 border-t border-black/[0.05] dark:border-white/[0.05]">
            <Button className="w-full h-14 rounded-2xl bg-gallery-gold text-white hover:bg-gallery-gold/90 shadow-lg shadow-gallery-gold/20 font-rubik text-xs font-bold uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98]">
              Export Master Asset
            </Button>
          </div>
        </div>

        {/* Custom Close Trigger for better feel on mobile */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 z-50 p-2 rounded-full bg-white/10 backdrop-blur-xl border border-white/10 text-white/40 hover:text-white transition-colors md:hidden"
        >
          <CloseIcon size={20} />
        </button>
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
      `}</style>
    </Dialog>
  )
}
