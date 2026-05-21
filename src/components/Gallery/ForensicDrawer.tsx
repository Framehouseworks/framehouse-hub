'use client'

import React, { useEffect, useState } from 'react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import type { Media } from '@/payload-types'
import {
  Calendar,
  Camera,
  X as CloseIcon,
  FileText,
  MapPin,
  Maximize2,
  Tag as TagIcon,
  Zap,
  Trash2,
  Edit3,
  RotateCcw,
  Plus,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react'
import Image from 'next/image'
import { deleteMediaAction, updateMediaAction } from '@/app/(dashboard)/actions/media'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'

interface ForensicDrawerProps {
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

export const ForensicDrawer: React.FC<ForensicDrawerProps> = ({ media, isOpen, onClose }) => {
  const [activeMedia, setActiveMedia] = useState<Media | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [newTagInput, setNewTagInput] = useState('')
  const router = useRouter()

  const { register, handleSubmit, reset, setValue, watch } = useForm<RefinementFormData>()
  const currentTags = watch('tags') || []

  // Track and persist the last selected media to preserve visual content during exit transitions
  useEffect(() => {
    if (media) {
      setActiveMedia(media)
    }
  }, [media])

  // Helper to extract plain text from Lexical JSON
  const getPlainTextFromLexical = (lexicalJson: unknown): string => {
    interface LexicalNode {
      children?: LexicalNode[]
      text?: string
    }

    try {
      if (!lexicalJson || typeof lexicalJson !== 'object') return ''
      const root = (lexicalJson as { root?: LexicalNode }).root
      const firstChild = root?.children?.[0]
      const firstTextNode = firstChild?.children?.[0]
      return firstTextNode?.text || ''
    } catch {
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
                mode: 'normal' as const,
                version: 1,
              },
            ],
          },
        ],
      },
    }
  }

  useEffect(() => {
    if (activeMedia) {
      reset({
        title: activeMedia.title || '',
        alt: activeMedia.alt || '',
        captionText: getPlainTextFromLexical(activeMedia.caption),
        tags: activeMedia.manualTags?.map((t) => t.tag).filter((t): t is string => !!t) || [],
        captureDate: activeMedia.captureDate
          ? new Date(activeMedia.captureDate).toISOString().split('T')[0]
          : '',
        locationAddress: activeMedia.location?.address || '',
        cameraModel: activeMedia.technical?.cameraModel || '',
        lensModel: activeMedia.technical?.lensModel || '',
        iso: activeMedia.technical?.iso || '',
        aperture: activeMedia.technical?.aperture || '',
        shutterSpeed: activeMedia.technical?.shutterSpeed || '',
        focalLength: activeMedia.technical?.focalLength || '',
      })
      setIsEditing(false)
    }
  }, [activeMedia, reset])

  if (!activeMedia) return null

  const onSave = async (data: RefinementFormData) => {
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
        toast.success('Archival metadata transactionally updated')
        setIsEditing(false)
        router.refresh()
      } else {
        toast.error(result.message || 'Identity update failed')
      }
    } catch {
      toast.error('An unexpected forensic error occurred')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to permanently delete this archival asset?')) return
    setIsDeleting(true)
    try {
      const result = await deleteMediaAction(activeMedia.id)
      if (result.success) {
        toast.success('Asset transactionally purged')
        onClose()
        router.refresh()
      } else {
        toast.error(result.message || 'Purge failed')
      }
    } catch {
      toast.error('Unexpected error during purge')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleAddTag = () => {
    if (newTagInput?.trim()) {
      const newTag = newTagInput.trim().toLowerCase()
      if (!currentTags.includes(newTag)) {
        setValue('tags', [...currentTags, newTag], { shouldDirty: true })
      }
      setNewTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setValue(
      'tags',
      currentTags.filter((t) => t !== tagToRemove),
      { shouldDirty: true },
    )
  }

  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
  const bestUrl = activeMedia.proxyUrl || activeMedia.originalUrl || activeMedia.url
  const src = bestUrl?.startsWith('http') ? bestUrl : `${serverUrl}${bestUrl || ''}`

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[500px] md:max-w-[900px] p-0 bg-white dark:bg-[#0a0c10] border-l border-black/[0.05] dark:border-white/[0.1] shadow-2xl overflow-hidden flex flex-col md:flex-row [&>button]:hidden"
      >
        {/* 1. Immersive Visual Preview Column */}
        <div className="relative w-full md:w-1/2 h-80 md:h-full bg-gallery-surface dark:bg-[#0d0f14] flex items-center justify-center border-r border-black/[0.03] dark:border-white/[0.03] overflow-hidden flex-shrink-0">
          <Image
            src={src}
            alt={activeMedia.alt || 'Archive Detail'}
            fill
            className="object-contain p-6 md:p-12 z-10"
            unoptimized
          />
          <div className="absolute top-6 left-6 z-20">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 dark:bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-lg">
              <ShieldCheck size={12} className="text-gallery-gold animate-pulse" />
              <span className="text-[10px] font-bold tracking-widest uppercase font-rubik mt-[1px]">
                {activeMedia.accessionId || 'FRH-PENDING'}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="absolute top-6 right-6 z-20 p-2 rounded-full bg-black/30 hover:bg-black/60 text-white transition-all shadow-md flex items-center justify-center border border-white/10"
            title="Close Panel"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        {/* 2. Scrollable Curation Panel & Authoritative Footer Wrapper */}
        <div className="flex-1 h-full flex flex-col min-w-0">
          {/* Scrollable Forensic Panels */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-10 bg-white dark:bg-[#0a0c10]">
            {/* Identity Block */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1 flex-1 mr-4">
                  <span className="text-[10px] font-bold tracking-widest text-gallery-gold uppercase font-rubik">
                    Archival Identity
                  </span>
                  {isEditing ? (
                    <input
                      {...register('title', { required: true })}
                      placeholder="Archival Title..."
                      className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-2 text-lg font-semibold focus:outline-none focus:ring-1 focus:ring-gallery-gold/50 transition-all text-primary"
                    />
                  ) : (
                    <h2 className="text-xl font-semibold tracking-tight text-primary break-all leading-tight">
                      {activeMedia.title || activeMedia.filename}
                    </h2>
                  )}
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

              {isEditing && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold tracking-widest text-on-surface/30 uppercase font-rubik">
                      Alt Description
                    </label>
                    <input
                      {...register('alt', { required: true })}
                      placeholder="Accessibility description..."
                      className="w-full bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.05] rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-gallery-gold/50 transition-all text-on-surface/60"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Dimension & File Size Origin Block */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gallery-surface/30 dark:bg-white/[0.01] p-4 rounded-2xl border border-black/[0.03] dark:border-white/[0.03]">
                <span className="text-[8px] font-bold tracking-[0.2em] text-on-surface/20 uppercase block mb-1">
                  Resolution
                </span>
                <p className="text-[10px] font-semibold text-primary">
                  {activeMedia.width} × {activeMedia.height}
                </p>
              </div>
              <div className="bg-gallery-surface/30 dark:bg-white/[0.01] p-4 rounded-2xl border border-black/[0.03] dark:border-white/[0.03]">
                <span className="text-[8px] font-bold tracking-[0.2em] text-on-surface/20 uppercase block mb-1">
                  Aspect
                </span>
                <p className="text-[10px] font-semibold text-primary">
                  {activeMedia.aspectRatio || '--'}
                </p>
              </div>
              <div className="bg-gallery-surface/30 dark:bg-white/[0.01] p-4 rounded-2xl border border-black/[0.03] dark:border-white/[0.03]">
                <span className="text-[8px] font-bold tracking-[0.2em] text-on-surface/20 uppercase block mb-1">
                  Size
                </span>
                <p className="text-[10px] font-semibold text-primary">
                  {activeMedia.filesize
                    ? (activeMedia.filesize / (1024 * 1024)).toFixed(2) + ' MB'
                    : '--'}
                </p>
              </div>
            </div>

            {/* Technical Bento Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Optics Bento box */}
              <div className="bg-gallery-surface/50 dark:bg-white/[0.02] p-5 rounded-[24px] border border-black/[0.03] dark:border-white/[0.03] space-y-3 flex flex-col justify-between">
                <div className="flex items-center gap-2 text-on-surface/40">
                  <Camera size={14} />
                  <span className="text-[9px] font-bold tracking-widest uppercase font-rubik">
                    Optics
                  </span>
                </div>
                <div className="space-y-1.5 w-full">
                  {isEditing ? (
                    <div className="space-y-2 w-full">
                      <input
                        {...register('cameraModel')}
                        placeholder="Camera Body (e.g. Sony A7R V)"
                        className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-gallery-gold/50 text-primary font-medium"
                      />
                      <input
                        {...register('lensModel')}
                        placeholder="Lens (e.g. FE 24-70mm)"
                        className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-gallery-gold/50 text-primary font-medium"
                      />
                    </div>
                  ) : (
                    <>
                      <p className="text-xs font-semibold truncate">
                        {activeMedia.technical?.cameraModel || 'Unknown Body'}
                      </p>
                      <p className="text-[10px] text-on-surface/40 truncate">
                        {activeMedia.technical?.lensModel || 'Unknown Glass'}
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Exposure Bento box */}
              <div className="bg-gallery-surface/50 dark:bg-white/[0.02] p-5 rounded-[24px] border border-black/[0.03] dark:border-white/[0.03] space-y-3 flex flex-col justify-between">
                <div className="flex items-center gap-2 text-on-surface/40">
                  <Zap size={14} />
                  <span className="text-[9px] font-bold tracking-widest uppercase font-rubik">
                    Exposure
                  </span>
                </div>
                {isEditing ? (
                  <div className="grid grid-cols-2 gap-2 w-full">
                    <div className="space-y-1">
                      <span className="text-[8px] text-on-surface/30 uppercase">ISO</span>
                      <input
                        {...register('iso')}
                        placeholder="100"
                        className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-gallery-gold/50 text-primary font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[8px] text-on-surface/30 uppercase">Aperture</span>
                      <input
                        {...register('aperture')}
                        placeholder="2.8"
                        className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-gallery-gold/50 text-primary font-bold"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-0.5">
                      <span className="text-[8px] text-on-surface/30 uppercase animate-pulse">
                        ISO
                      </span>
                      <p className="text-xs font-bold">{activeMedia.technical?.iso || '--'}</p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[8px] text-on-surface/30 uppercase">Aperture</span>
                      <p className="text-xs font-bold">
                        {activeMedia.technical?.aperture
                          ? `f/${activeMedia.technical.aperture}`
                          : '--'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Forensic Description */}
            <div className="space-y-4">
              <label className="text-[10px] font-bold tracking-widest text-on-surface/30 uppercase flex items-center gap-2">
                <FileText size={12} className="text-gallery-gold" />
                Description
              </label>
              {isEditing ? (
                <textarea
                  {...register('captionText')}
                  rows={4}
                  className="w-full bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.05] rounded-2xl px-5 py-4 text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-gallery-gold/50 transition-all resize-none"
                  placeholder="Archival significance..."
                />
              ) : (
                <p className="text-sm text-on-surface/70 leading-relaxed">
                  {getPlainTextFromLexical(activeMedia.caption) ||
                    'No archival description recorded.'}
                </p>
              )}
            </div>

            {/* Classification Tags */}
            <div className="space-y-6">
              <div className="space-y-4">
                <label className="text-[10px] font-bold tracking-widest text-on-surface/30 uppercase flex items-center gap-2">
                  <TagIcon size={12} className="text-gallery-gold" />
                  Archival Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {(isEditing
                    ? currentTags
                    : ((activeMedia.manualTags || []) as { tag?: string }[])
                  ).map((tagData, idx: number) => {
                    const tag = typeof tagData === 'string' ? tagData : tagData.tag
                    if (!tag) return null
                    return (
                      <div
                        key={idx}
                        className="h-7 px-3 rounded-lg bg-black/[0.03] dark:bg-white/5 border border-black/[0.03] dark:border-white/[0.03] text-[10px] font-medium flex items-center gap-2"
                      >
                        {tag}
                        {isEditing && (
                          <button
                            onClick={() => handleRemoveTag(tag)}
                            className="text-on-surface/20 hover:text-red-500"
                          >
                            <CloseIcon size={10} />
                          </button>
                        )}
                      </div>
                    )
                  })}
                  {isEditing && (
                    <div className="flex items-center gap-2 w-full mt-2">
                      <input
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                        placeholder="New tag..."
                        className="flex-1 bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.05] rounded-lg px-3 h-8 text-[10px] focus:outline-none focus:ring-1 focus:ring-gallery-gold/50"
                      />
                      <Button
                        onClick={handleAddTag}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 rounded-lg border border-dashed border-on-surface/20"
                      >
                        <Plus size={12} />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {activeMedia.heuristicTags && activeMedia.heuristicTags.length > 0 && (
                <div className="space-y-4">
                  <label className="text-[10px] font-bold tracking-widest text-on-surface/20 uppercase flex items-center gap-2">
                    <Zap size={12} className="text-on-surface/20" />
                    System Tags
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {activeMedia.heuristicTags.map((tagData, idx: number) => (
                      <div
                        key={idx}
                        className="h-7 px-3 rounded-lg bg-gallery-gold/[0.03] border border-gallery-gold/10 text-[10px] font-medium text-gallery-gold/60 flex items-center italic"
                      >
                        {tagData.tag}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Origin & Timeline */}
            <div className="bg-gallery-surface/30 dark:bg-white/[0.01] rounded-[24px] p-6 space-y-4 border border-black/[0.02] dark:border-white/[0.02]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-on-surface/40">
                  <Calendar size={14} />
                  <span className="text-[9px] font-bold tracking-widest uppercase font-rubik mt-[1px]">
                    Timeline
                  </span>
                </div>
                {isEditing ? (
                  <input
                    {...register('captureDate')}
                    type="date"
                    className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-2 py-1 text-[11px] font-bold focus:outline-none focus:ring-1 focus:ring-gallery-gold/50 text-primary"
                  />
                ) : (
                  <span className="text-[11px] font-bold">
                    {activeMedia.captureDate
                      ? new Date(activeMedia.captureDate).toLocaleDateString()
                      : 'Unknown Origin'}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-on-surface/40">
                  <MapPin size={14} />
                  <span className="text-[9px] font-bold tracking-widest uppercase font-rubik mt-[1px]">
                    Origin
                  </span>
                </div>
                {isEditing ? (
                  <input
                    {...register('locationAddress')}
                    className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-2 py-1 text-[11px] font-bold text-right focus:outline-none focus:ring-1 focus:ring-gallery-gold/50 text-primary max-w-[200px]"
                    placeholder="Address..."
                  />
                ) : (
                  <span className="text-[11px] font-bold truncate max-w-[200px]">
                    {activeMedia.location?.address || 'No location record'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 3. Authoritative Footer */}
          <div className="p-8 bg-gallery-surface/30 dark:bg-black/20 border-t border-black/[0.05] dark:border-white/[0.05] space-y-3">
            {isEditing ? (
              <>
                <Button
                  className="w-full h-14 rounded-2xl bg-gallery-gold text-white hover:bg-gallery-gold/90 shadow-xl shadow-gallery-gold/20 font-rubik text-[10px] font-bold uppercase tracking-[0.2em] transition-all"
                  onClick={handleSubmit(onSave)}
                  disabled={isSaving}
                >
                  {isSaving ? 'Synchronizing...' : 'Commit Changes'}
                  <ArrowRight size={14} className="ml-2" />
                </Button>
                <Button
                  variant="ghost"
                  className="w-full h-14 rounded-2xl text-on-surface/40 hover:text-primary font-rubik text-[10px] font-bold uppercase tracking-[0.2em]"
                  onClick={() => {
                    setIsEditing(false)
                    reset()
                  }}
                  disabled={isSaving}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Discard
                </Button>
              </>
            ) : (
              <div className="flex gap-3">
                <Button
                  variant="destructive"
                  className="flex-1 h-14 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 font-rubik text-[10px] font-bold uppercase tracking-[0.2em] transition-all"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Purge
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 h-14 rounded-2xl border-black/[0.05] dark:border-white/[0.05] text-on-surface/60 hover:bg-gallery-gold/5 hover:text-gallery-gold font-rubik text-[10px] font-bold uppercase tracking-[0.2em]"
                  onClick={() => window.open(src, '_blank')}
                >
                  <Maximize2 className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            )}
          </div>
        </div>
      </SheetContent>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(127, 87, 0, 0.1);
          border-radius: 10px;
        }
      `}</style>
    </Sheet>
  )
}
