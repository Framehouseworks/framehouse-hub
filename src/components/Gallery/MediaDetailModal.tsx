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
  Trash2,
  Edit3,
  Save,
  RotateCcw,
  Plus,
} from 'lucide-react'
import Image from 'next/image'
import React, { useEffect, useState } from 'react'
import { deleteMediaAction, updateMediaAction } from '@/app/(dashboard)/actions/media'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'

interface MediaDetailModalProps {
  media: Media | null
  isOpen: boolean
  onClose: () => void
}

interface RefinementFormData {
  title: string
  alt: string
  captionText: string
  tags: string[]
  captureDate: string
  locationAddress: string
  cameraModel: string
  lensModel: string
  iso: number | string
  aperture: number | string
  shutterSpeed: string
  focalLength: number | string
}

export const MediaDetailModal: React.FC<MediaDetailModalProps> = ({ media, isOpen, onClose }) => {
  const [lastMedia, setLastMedia] = useState<Media | null>(media)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [newTagInput, setNewTagInput] = useState('')
  const router = useRouter()

  // Helper to extract plain text from Lexical JSON
  const getPlainTextFromLexical = (lexicalJson: unknown): string => {
    try {
      if (!lexicalJson || typeof lexicalJson !== 'object') return ''

      const root = (
        lexicalJson as { root?: { children?: Array<{ children?: Array<{ text?: string }> }> } }
      ).root
      const firstChild = root?.children?.[0]
      const firstTextNode = firstChild?.children?.[0]

      return firstTextNode?.text || ''
    } catch (_e) {
      return ''
    }
  }

  // Helper to convert plain text to Lexical JSON
  const convertTextToLexical = (text: string) => {
    return {
      root: {
        type: 'root',
        format: 'left' as const,
        indent: 0,
        version: 1,
        direction: 'ltr' as const,
        children: [
          {
            type: 'paragraph',
            format: 'left' as const,
            indent: 0,
            version: 1,
            direction: 'ltr' as const,
            children: [
              {
                type: 'text',
                text: text,
                format: 0,
                style: '',
                detail: 0,
                mode: 'normal',
                version: 1,
              },
            ],
          },
        ],
      },
    }
  }

  const { register, handleSubmit, reset, setValue, watch } = useForm<RefinementFormData>()

  const currentTags = watch('tags') || []

  // Reset form with current media data
  useEffect(() => {
    if (media) {
      setLastMedia(media)
      reset({
        title: media.title || '',
        alt: media.alt || '',
        captionText: getPlainTextFromLexical(media.caption),
        tags: media.manualTags?.map((t) => t.tag).filter((t): t is string => !!t) || [],
        captureDate: media.captureDate
          ? new Date(media.captureDate).toISOString().split('T')[0]
          : '',
        locationAddress: media.location?.address || '',
        cameraModel: media.technical?.cameraModel || '',
        lensModel: media.technical?.lensModel || '',
        iso: media.technical?.iso || '',
        aperture: media.technical?.aperture || '',
        shutterSpeed: media.technical?.shutterSpeed || '',
        focalLength: media.technical?.focalLength || '',
      })
      setIsEditing(false)
    }
  }, [media, reset])

  // If we have no media to show (initial or cleared and not closing), return null
  if (!media && !lastMedia && !isOpen) return null

  // Use the current media or the last active one for the closing animation
  const activeMedia = media || lastMedia
  if (!activeMedia) return null

  const handleDelete = async () => {
    if (!activeMedia) return

    const confirmDelete = window.confirm(
      'Are you sure you want to permanently delete this archival asset? This action cannot be undone.',
    )
    if (!confirmDelete) return

    setIsDeleting(true)
    try {
      const result = await deleteMediaAction(activeMedia.id)
      if (result.success) {
        toast.success('Asset deleted successfully')
        onClose()
        router.refresh()
      } else {
        toast.error(result.message || 'Failed to delete asset')
      }
    } catch (_error) {
      toast.error('An unexpected error occurred')
    } finally {
      setIsDeleting(false)
    }
  }

  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
  // Prefer the canonical enclave URL stamped by writeOriginalToEnclave /
  // register-gcs. Payload's own `url` is filename-only and points at the
  // legacy flat path, which no longer exists with disableLocalStorage.
  const canonicalUrl = activeMedia.originalUrl || activeMedia.url
  const src = canonicalUrl?.startsWith('http') ? canonicalUrl : `${serverUrl}${canonicalUrl ?? ''}`

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

  const onSave = async (data: RefinementFormData) => {
    if (!activeMedia) return

    setIsSaving(true)
    try {
      const result = await updateMediaAction(activeMedia.id, {
        title: data.title,
        alt: data.alt,
        caption: convertTextToLexical(data.captionText),
        manualTags: data.tags.map((t) => ({ tag: t })),
        captureDate: data.captureDate ? new Date(data.captureDate).toISOString() : null,
        technical: {
          cameraModel: data.cameraModel,
          lensModel: data.lensModel,
          iso: data.iso ? Number(data.iso) : null,
          aperture: data.aperture ? Number(data.aperture) : null,
          shutterSpeed: data.shutterSpeed,
          focalLength: data.focalLength ? Number(data.focalLength) : null,
        },
        location: {
          address: data.locationAddress,
        },
      })

      if (result.success) {
        toast.success('Metadata updated successfully')
        setIsEditing(false)
        router.refresh()
      } else {
        toast.error(result.message || 'Failed to save changes')
      }
    } catch (_error) {
      toast.error('An unexpected error occurred while saving')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddTag = () => {
    if (newTagInput && newTagInput.trim()) {
      const newTag = newTagInput.trim().toLowerCase()
      if (!currentTags.includes(newTag)) {
        setValue('tags', [...currentTags, newTag], { shouldDirty: true })
      }
      setNewTagInput('')
    }
  }

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setValue(
      'tags',
      currentTags.filter((t) => t !== tagToRemove),
      { shouldDirty: true },
    )
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
        <div className="w-full md:w-[450px] bg-white dark:bg-[#0a0c10] flex flex-col relative">
          {/* Header */}
          <div className="p-10 border-b border-black/[0.03] dark:border-white/[0.03]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-6 px-3 rounded-full bg-gallery-gold/10 text-gallery-gold border border-gallery-gold/20 flex items-center justify-center leading-none">
                  <span className="text-[9px] font-bold tracking-widest uppercase font-rubik mt-[1px]">
                    Metadata
                  </span>
                </div>
                <span className="text-[10px] text-on-surface/40 uppercase tracking-widest font-varela bg-black/[0.03] dark:bg-white/[0.03] px-2 py-0.5 rounded-md border border-black/[0.05] dark:border-white/[0.05]">
                  {activeMedia.accessionId || `#${activeMedia.id}`}
                </span>
              </div>

              {!isEditing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="h-8 rounded-lg gap-2 text-on-surface/40 hover:text-gallery-gold transition-colors text-[10px] uppercase font-bold tracking-wider"
                >
                  <Edit3 size={14} />
                  Edit
                </Button>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold tracking-widest text-on-surface/30 uppercase">
                    Asset Title
                  </label>
                  <input
                    {...register('title', { required: true })}
                    className="w-full bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.05] rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-gallery-gold/50 transition-all"
                    placeholder="Enter asset title..."
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold tracking-widest text-on-surface/30 uppercase">
                    Alt Text
                  </label>
                  <input
                    {...register('alt', { required: true })}
                    className="w-full bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.05] rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-gallery-gold/50 transition-all text-on-surface/60"
                    placeholder="Brief description for accessibility..."
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold tracking-tight text-primary break-all leading-tight">
                  {activeMedia.title || activeMedia.filename}
                </h2>
                <p className="text-[10px] text-on-surface/30 font-mono tracking-tighter truncate">
                  {activeMedia.filename}
                </p>
              </div>
            )}
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-10 space-y-10 scrollbar-hide custom-scrollbar">
            {/* Description */}
            <section className="space-y-5">
              <label className="text-[10px] font-bold tracking-widest text-on-surface/30 uppercase flex items-center gap-2">
                <FileText size={12} className="text-gallery-gold" />
                Description
              </label>
              {isEditing ? (
                <textarea
                  {...register('captionText')}
                  rows={3}
                  className="w-full bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.05] rounded-2xl px-5 py-4 text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-gallery-gold/50 transition-all resize-none"
                  placeholder="Enter archival context or significance..."
                />
              ) : activeMedia.caption ? (
                <p className="text-sm text-on-surface/70 leading-relaxed italic">
                  &ldquo;{getPlainTextFromLexical(activeMedia.caption)}&rdquo;
                </p>
              ) : (
                <p className="text-xs text-on-surface/30 italic">No description provided.</p>
              )}
            </section>

            {/* Classification */}
            <section className="space-y-5">
              <label className="text-[10px] font-bold tracking-widest text-on-surface/30 uppercase flex items-center gap-2">
                <TagIcon size={12} className="text-gallery-gold" />
                Classification
              </label>
              <div className="flex flex-wrap gap-2.5">
                {(isEditing ? currentTags : activeMedia.manualTags || []).map((tagData, idx) => {
                  const tag = typeof tagData === 'string' ? tagData : tagData.tag
                  if (!tag) return null
                  return (
                    <div
                      key={idx}
                      className="h-8 px-4 rounded-xl bg-gallery-surface dark:bg-white/5 border border-black/[0.03] dark:border-white/[0.03] text-[11px] font-medium flex items-center justify-center leading-none group relative"
                    >
                      <span className="mt-[1px]">{tag}</span>
                      {isEditing && (
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-2 text-on-surface/20 hover:text-red-500 transition-colors"
                        >
                          <CloseIcon size={12} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
              {isEditing && (
                <div className="flex items-center gap-2">
                  <input
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder="Add tag..."
                    className="flex-1 bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.05] rounded-xl px-4 h-9 text-xs focus:outline-none focus:ring-1 focus:ring-gallery-gold/50 transition-all"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleAddTag}
                    className="h-9 w-9 rounded-xl border border-dashed border-on-surface/20 text-on-surface/40 hover:text-gallery-gold hover:border-gallery-gold/30"
                  >
                    <Plus size={14} />
                  </Button>
                </div>
              )}
            </section>

            {/* Specifications */}
            <section className="space-y-5">
              <label className="text-[10px] font-bold tracking-widest text-on-surface/30 uppercase flex items-center gap-2">
                <Zap size={12} className="text-gallery-gold" />
                Specifications
              </label>
              {isEditing ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <span className="text-[8px] text-on-surface/40 uppercase font-rubik tracking-wider">
                      Camera Model
                    </span>
                    <input
                      {...register('cameraModel')}
                      className="w-full bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.05] rounded-lg px-3 py-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-gallery-gold/50 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[8px] text-on-surface/40 uppercase font-rubik tracking-wider">
                      Lens Model
                    </span>
                    <input
                      {...register('lensModel')}
                      className="w-full bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.05] rounded-lg px-3 py-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-gallery-gold/50 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[8px] text-on-surface/40 uppercase font-rubik tracking-wider">
                      ISO
                    </span>
                    <input
                      {...register('iso')}
                      type="number"
                      className="w-full bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.05] rounded-lg px-3 py-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-gallery-gold/50 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[8px] text-on-surface/40 uppercase font-rubik tracking-wider">
                      Aperture
                    </span>
                    <input
                      {...register('aperture')}
                      type="number"
                      step="0.1"
                      className="w-full bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.05] rounded-lg px-3 py-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-gallery-gold/50 transition-all"
                    />
                  </div>
                </div>
              ) : (
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
              )}
            </section>

            {/* Logistics & Origin */}
            <section className="space-y-5 pt-6 border-t border-black/[0.03] dark:border-white/[0.03]">
              <label className="text-[10px] font-bold tracking-widest text-on-surface/30 uppercase flex items-center gap-2">
                <MapPin size={12} className="text-gallery-gold" />
                Logistics & Origin
              </label>

              <div className="space-y-4">
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-3 text-on-surface/40">
                    <Calendar size={14} />
                    <span className="uppercase tracking-wider font-bold text-[9px]">Captured</span>
                  </div>
                  {isEditing ? (
                    <input
                      {...register('captureDate')}
                      type="date"
                      className="bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.05] rounded-lg px-3 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-gallery-gold/50 transition-all"
                    />
                  ) : activeMedia.captureDate ? (
                    <span className="font-medium text-primary">
                      {new Date(activeMedia.captureDate).toLocaleDateString(undefined, {
                        dateStyle: 'long',
                      })}
                    </span>
                  ) : (
                    <span className="text-on-surface/40 italic">Temporal context unknown</span>
                  )}
                </div>

                {!isEditing && (
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-3 text-on-surface/40">
                      <Info size={14} />
                      <span className="uppercase tracking-wider font-bold text-[9px]">
                        Ingested
                      </span>
                    </div>
                    <span className="font-medium text-primary">
                      {new Date(activeMedia.createdAt).toLocaleDateString(undefined, {
                        dateStyle: 'long',
                      })}
                    </span>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-on-surface/40">
                    <MapPin size={14} />
                    <span className="uppercase tracking-wider font-bold text-[9px]">Location</span>
                  </div>
                  {isEditing ? (
                    <input
                      {...register('locationAddress')}
                      placeholder="Enter location address..."
                      className="w-full bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.05] rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-gallery-gold/50 transition-all"
                    />
                  ) : activeMedia.location?.address ? (
                    <p className="text-xs text-on-surface/60 italic px-4 py-3 rounded-2xl bg-gallery-surface/50 dark:bg-white/[0.02] border border-black/[0.02] dark:border-white/[0.02]">
                      {activeMedia.location.address}
                    </p>
                  ) : (
                    <p className="text-xs text-on-surface/20 italic px-4">No location recorded.</p>
                  )}
                </div>
              </div>
            </section>
          </div>

          {/* Footer Actions */}
          <div className="p-10 bg-gallery-surface/30 dark:bg-black/20 border-t border-black/[0.05] dark:border-white/[0.05] flex flex-col gap-3">
            {isEditing ? (
              <>
                <Button
                  className="w-full h-14 rounded-2xl bg-gallery-gold text-white hover:bg-gallery-gold/90 shadow-lg shadow-gallery-gold/20 font-rubik text-xs font-bold uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98]"
                  onClick={handleSubmit(onSave)}
                  disabled={isSaving}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? 'Saving Changes...' : 'Save Changes'}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full h-14 rounded-2xl text-on-surface/40 hover:text-primary font-rubik text-xs font-bold uppercase tracking-widest transition-all"
                  onClick={() => {
                    setIsEditing(false)
                    reset()
                  }}
                  disabled={isSaving}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Discard Changes
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="destructive"
                  className="w-full h-14 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 font-rubik text-xs font-bold uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98]"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {isDeleting ? 'Deleting...' : 'Delete Media'}
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-14 rounded-2xl border-black/[0.05] dark:border-white/[0.05] text-on-surface/60 hover:bg-gallery-gold/5 hover:text-gallery-gold font-rubik text-xs font-bold uppercase tracking-widest transition-all"
                  onClick={handleExpand}
                >
                  <Maximize2 className="mr-2 h-4 w-4" />
                  Export Master
                </Button>
              </>
            )}
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
