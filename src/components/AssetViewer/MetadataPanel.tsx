'use client'

/** Height of the always-visible peek strip. Exported so the parent layout
 *  can reserve exactly this much space in the flex column, preventing the
 *  image stage from ever being obscured in the resting (closed) state. */
export const PEEK_HEIGHT = 72

import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Camera,
  Calendar,
  MapPin,
  Tag as TagIcon,
  Zap,
  Edit3,
  ArrowRight,
  RotateCcw,
  Plus,
  X as CloseIcon,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import type { Media } from '@/payload-types'
import { Button } from '@/components/ui/button'
import { updateMediaAction } from '@/app/(dashboard)/actions/media'
import { cn } from '@/utilities/cn'

// ─── Types ─────────────────────────────────────────────────────────────────

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

interface MetadataPanelProps {
  media: Media
  /** true → right-side collapsible panel; false → mobile bottom drawer */
  isDesktop: boolean
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getPlainTextFromLexical(lexicalJson: unknown): string {
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

function convertTextToLexical(text: string) {
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
              text,
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

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return '--'
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '--'
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// ─── Section Label ──────────────────────────────────────────────────────────

const SectionLabel: React.FC<{ icon?: React.ReactNode; children: React.ReactNode }> = ({
  icon,
  children,
}) => (
  <div className="flex items-center gap-2 text-on-surface/40">
    {icon}
    <span className="text-[9px] font-bold tracking-[0.2em] uppercase font-rubik">{children}</span>
  </div>
)

// ─── Stat Tile ───────────────────────────────────────────────────────────────

const StatTile: React.FC<{ label: string; value: string | number | null | undefined }> = ({
  label,
  value,
}) => (
  <div className="bg-black/[0.03] dark:bg-white/[0.03] p-3 rounded-2xl">
    <span className="text-[8px] font-bold tracking-[0.18em] text-on-surface/25 uppercase block mb-1">
      {label}
    </span>
    <p className="text-[10px] font-bold font-rubik text-primary truncate">{value || '--'}</p>
  </div>
)

// ─── Panel Content ──────────────────────────────────────────────────────────

const PanelContent: React.FC<{
  media: Media
  isEditing: boolean
  isSaving: boolean
  setIsEditing: (v: boolean) => void
  register: ReturnType<typeof useForm<RefinementFormData>>['register']
  handleSubmit: ReturnType<typeof useForm<RefinementFormData>>['handleSubmit']
  reset: ReturnType<typeof useForm<RefinementFormData>>['reset']
  watch: ReturnType<typeof useForm<RefinementFormData>>['watch']
  setValue: ReturnType<typeof useForm<RefinementFormData>>['setValue']
  onSave: (data: RefinementFormData) => void
}> = ({
  media,
  isEditing,
  isSaving,
  setIsEditing,
  register,
  handleSubmit,
  reset,
  watch,
  setValue,
  onSave,
}) => {
  const currentTags = watch('tags') || []
  const [newTagInput, setNewTagInput] = useState('')

  const handleAddTag = () => {
    const tag = newTagInput.trim().toLowerCase()
    if (tag && !currentTags.includes(tag)) {
      setValue('tags', [...currentTags, tag], { shouldDirty: true })
    }
    setNewTagInput('')
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setValue(
      'tags',
      currentTags.filter((t) => t !== tagToRemove),
      { shouldDirty: true },
    )
  }

  return (
    <div className="space-y-8 p-6 pb-10">
      {/* ── Identity ──────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck size={11} className="text-gallery-gold shrink-0" />
              <span className="text-[9px] font-bold tracking-[0.18em] uppercase font-rubik text-gallery-gold">
                {media.accessionId || 'Pending Accession'}
              </span>
            </div>
            {isEditing ? (
              <input
                {...register('title', { required: true })}
                placeholder="Asset title…"
                className="w-full bg-black/[0.04] dark:bg-white/[0.04] rounded-2xl px-4 py-2.5 text-base font-semibold focus:outline-none focus:ring-1 focus:ring-gallery-gold/50 transition-all text-primary"
              />
            ) : (
              <h2 className="text-lg font-semibold tracking-tight text-primary break-words leading-snug">
                {media.title || media.filename || 'Untitled'}
              </h2>
            )}
          </div>
          {!isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="h-8 rounded-xl gap-1.5 text-on-surface/35 hover:text-gallery-gold transition-colors text-[9px] uppercase font-bold tracking-wider shrink-0"
            >
              <Edit3 size={12} />
              Edit
            </Button>
          )}
        </div>

        {isEditing && (
          <div className="space-y-2">
            <label className="text-[9px] font-bold tracking-widest text-on-surface/30 uppercase font-rubik">
              Alt Text
            </label>
            <input
              {...register('alt')}
              placeholder="Accessibility description…"
              className="w-full bg-black/[0.03] dark:bg-white/[0.03] rounded-2xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-gallery-gold/50 transition-all text-on-surface/60"
            />
          </div>
        )}
      </div>

      {/* ── File Stats ────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2">
        <StatTile
          label="Resolution"
          value={media.width && media.height ? `${media.width}×${media.height}` : null}
        />
        <StatTile label="Aspect" value={media.aspectRatio} />
        <StatTile label="Size" value={formatFileSize(media.filesize)} />
      </div>

      {/* ── Technical / Optics ────────────────────────────────── */}
      <div className="space-y-3">
        <SectionLabel icon={<Camera size={12} />}>Optics</SectionLabel>
        <div className="bg-black/[0.03] dark:bg-white/[0.03] rounded-[20px] p-4 space-y-3">
          {isEditing ? (
            <div className="space-y-2">
              <input
                {...register('cameraModel')}
                placeholder="Camera body (e.g. Sony A7R V)"
                className="w-full bg-white/60 dark:bg-white/[0.04] rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-gallery-gold/50 text-primary"
              />
              <input
                {...register('lensModel')}
                placeholder="Lens (e.g. FE 24-70mm f/2.8)"
                className="w-full bg-white/60 dark:bg-white/[0.04] rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-gallery-gold/50 text-primary"
              />
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold truncate">
                {media.technical?.cameraModel || 'Unknown Body'}
              </p>
              <p className="text-[10px] text-on-surface/40 truncate">
                {media.technical?.lensModel || 'Unknown Glass'}
              </p>
            </>
          )}
        </div>
      </div>

      {/* ── Exposure ──────────────────────────────────────────── */}
      <div className="space-y-3">
        <SectionLabel icon={<Zap size={12} />}>Exposure</SectionLabel>
        {isEditing ? (
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { field: 'iso' as const, label: 'ISO', placeholder: '100' },
                { field: 'aperture' as const, label: 'Aperture', placeholder: '2.8' },
                { field: 'shutterSpeed' as const, label: 'Shutter', placeholder: '1/250' },
                { field: 'focalLength' as const, label: 'Focal', placeholder: '50' },
              ] as const
            ).map(({ field, label, placeholder }) => (
              <div key={field} className="space-y-1">
                <span className="text-[8px] font-bold uppercase tracking-wider text-on-surface/30">
                  {label}
                </span>
                <input
                  {...register(field)}
                  placeholder={placeholder}
                  className="w-full bg-black/[0.03] dark:bg-white/[0.03] rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-gallery-gold/50 text-primary"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3 flex-wrap">
            {[
              { label: 'ISO', value: media.technical?.iso },
              {
                label: 'f/',
                value: media.technical?.aperture ? `f/${media.technical.aperture}` : null,
              },
              { label: '', value: media.technical?.shutterSpeed },
              {
                label: '',
                value: media.technical?.focalLength ? `${media.technical.focalLength}mm` : null,
              },
            ]
              .filter((x) => x.value)
              .map((x, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-xl bg-black/[0.04] dark:bg-white/[0.04] text-[10px] font-bold font-rubik text-primary"
                >
                  {x.value}
                </span>
              ))}
            {!media.technical?.iso && !media.technical?.aperture && (
              <span className="text-[10px] text-on-surface/30 font-rubik">No EXIF data</span>
            )}
          </div>
        )}
      </div>

      {/* ── Tags ──────────────────────────────────────────────── */}
      <div className="space-y-3">
        <SectionLabel icon={<TagIcon size={12} />}>Tags</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {(isEditing
            ? currentTags
            : ((media.manualTags || []).map((t) => t.tag).filter(Boolean) as string[])
          ).map((tag, i) => (
            <div
              key={i}
              className="h-6 px-3 rounded-xl bg-black/[0.04] dark:bg-white/[0.04] text-[10px] font-medium flex items-center gap-1.5 text-on-surface/70"
            >
              {tag}
              {isEditing && (
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="text-on-surface/30 hover:text-red-500 transition-colors"
                >
                  <CloseIcon size={9} />
                </button>
              )}
            </div>
          ))}
          {isEditing && (
            <div className="flex items-center gap-2 w-full mt-1">
              <input
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder="Add tag…"
                className="flex-1 bg-black/[0.03] dark:bg-white/[0.03] rounded-xl px-3 h-7 text-[10px] focus:outline-none focus:ring-1 focus:ring-gallery-gold/50"
              />
              <Button
                type="button"
                onClick={handleAddTag}
                variant="ghost"
                size="sm"
                className="h-7 w-7 rounded-xl border border-dashed border-on-surface/20 p-0"
              >
                <Plus size={11} />
              </Button>
            </div>
          )}
        </div>

        {/* System / heuristic tags */}
        {(media.heuristicTags?.length ?? 0) > 0 && !isEditing && (
          <div className="flex flex-wrap gap-2 pt-1">
            {media.heuristicTags!.map((t, i) => (
              <div
                key={i}
                className="h-6 px-3 rounded-xl bg-gallery-gold/[0.05] border border-gallery-gold/10 text-[10px] font-medium text-gallery-gold/50 flex items-center italic"
              >
                {t.tag}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Timeline & Origin ─────────────────────────────────── */}
      <div className="bg-black/[0.02] dark:bg-white/[0.02] rounded-[20px] p-4 space-y-4">
        <div className="flex items-center justify-between">
          <SectionLabel icon={<Calendar size={12} />}>Capture</SectionLabel>
          {isEditing ? (
            <input
              {...register('captureDate')}
              type="date"
              className="bg-black/[0.04] dark:bg-white/[0.04] rounded-xl px-2 py-1 text-[10px] font-bold focus:outline-none focus:ring-1 focus:ring-gallery-gold/50 text-primary"
            />
          ) : (
            <span className="text-[10px] font-bold font-rubik text-primary">
              {formatDate(media.captureDate)}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <SectionLabel icon={<MapPin size={12} />}>Location</SectionLabel>
          {isEditing ? (
            <input
              {...register('locationAddress')}
              placeholder="Address…"
              className="bg-black/[0.04] dark:bg-white/[0.04] rounded-xl px-2 py-1 text-[10px] font-bold text-right focus:outline-none focus:ring-1 focus:ring-gallery-gold/50 text-primary max-w-[140px]"
            />
          ) : (
            <span className="text-[10px] font-bold text-primary truncate max-w-[160px]">
              {media.location?.address || '--'}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <SectionLabel>Ingested</SectionLabel>
          <span className="text-[10px] font-bold font-rubik text-on-surface/40">
            {formatDate(media.createdAt)}
          </span>
        </div>
      </div>

      {/* ── Description ───────────────────────────────────────── */}
      {(isEditing || getPlainTextFromLexical(media.caption)) && (
        <div className="space-y-2">
          <SectionLabel>Description</SectionLabel>
          {isEditing ? (
            <textarea
              {...register('captionText')}
              rows={3}
              placeholder="Archival significance…"
              className="w-full bg-black/[0.03] dark:bg-white/[0.03] rounded-2xl px-4 py-3 text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-gallery-gold/50 transition-all resize-none"
            />
          ) : (
            <p className="text-xs text-on-surface/60 leading-relaxed">
              {getPlainTextFromLexical(media.caption)}
            </p>
          )}
        </div>
      )}

      {/* ── Edit Action Footer ────────────────────────────────── */}
      {isEditing && (
        <div className="space-y-2 pt-2">
          <Button
            className="w-full h-12 rounded-2xl bg-gallery-gold text-white hover:bg-gallery-gold/90 shadow-lg shadow-gallery-gold/20 font-rubik text-[9px] font-bold uppercase tracking-[0.2em] transition-all"
            onClick={handleSubmit(onSave)}
            disabled={isSaving}
          >
            {isSaving ? 'Saving…' : 'Commit Changes'}
            <ArrowRight size={13} className="ml-2" />
          </Button>
          <Button
            variant="ghost"
            className="w-full h-12 rounded-2xl text-on-surface/40 hover:text-primary font-rubik text-[9px] font-bold uppercase tracking-[0.2em]"
            onClick={() => {
              setIsEditing(false)
              reset()
            }}
            disabled={isSaving}
            type="button"
          >
            <RotateCcw className="mr-2 h-3.5 w-3.5" />
            Discard
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── MetadataPanel ──────────────────────────────────────────────────────────

export const MetadataPanel: React.FC<MetadataPanelProps> = ({ media, isDesktop }) => {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Desktop panel is always expanded — collapse was removed as unnecessary chrome

  // Mobile drawer — derived from real viewport once mounted
  const OPEN_FRACTION = 0.62
  const drawerRef = useRef<HTMLDivElement | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Compute open height from real viewport. SSR-safe: start with a reasonable
  // approximation so the initial y value is close to correct.
  const [openHeight, setOpenHeight] = useState(() =>
    typeof window !== 'undefined' ? Math.round(window.innerHeight * OPEN_FRACTION) : 380,
  )
  useEffect(() => {
    const update = () => setOpenHeight(Math.round(window.innerHeight * OPEN_FRACTION))
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // closedOffset: how far the sheet is translated downward in the peek state.
  // y = closedOffset → only PEEK_HEIGHT visible
  // y = 0            → full openHeight visible (overlays stage intentionally)
  const closedOffset = openHeight - PEEK_HEIGHT

  // Initialise in the peek (closed) position
  const y = useMotionValue(closedOffset)

  const { register, handleSubmit, reset, setValue, watch } = useForm<RefinementFormData>()

  // Sync form with media when it changes
  useEffect(() => {
    reset({
      title: media.title || '',
      alt: media.alt || '',
      captionText: getPlainTextFromLexical(media.caption),
      tags: media.manualTags?.map((t) => t.tag).filter((t): t is string => !!t) || [],
      captureDate: media.captureDate ? new Date(media.captureDate).toISOString().split('T')[0] : '',
      locationAddress: media.location?.address || '',
      cameraModel: media.technical?.cameraModel || '',
      lensModel: media.technical?.lensModel || '',
      iso: media.technical?.iso ?? '',
      aperture: media.technical?.aperture ?? '',
      shutterSpeed: media.technical?.shutterSpeed || '',
      focalLength: media.technical?.focalLength ?? '',
    })
    setIsEditing(false)
  }, [media.id, reset]) // eslint-disable-line react-hooks/exhaustive-deps

  const onSave = async (data: RefinementFormData) => {
    setIsSaving(true)
    try {
      const result = await updateMediaAction(media.id, {
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
        location: { address: data.locationAddress },
      })
      if (result.success) {
        toast.success('Metadata updated')
        setIsEditing(false)
        router.refresh()
      } else {
        toast.error(result.message || 'Update failed')
      }
    } catch {
      toast.error('Unexpected error')
    } finally {
      setIsSaving(false)
    }
  }

  // opacity: more opaque when fully open (y=0), slightly translucent at peek (y=closedOffset)
  const opacity = useTransform(y, [0, closedOffset], [1, 0.82])

  // Sync y when openHeight / closedOffset changes (viewport resize, or first mount correction)
  useEffect(() => {
    if (!drawerOpen) {
      animate(y, closedOffset, { duration: 0 }) // instant — no spring on resize
    }
  }, [closedOffset]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset to peek whenever the displayed asset changes
  useEffect(() => {
    animate(y, closedOffset, { type: 'spring', stiffness: 400, damping: 40 })
    setDrawerOpen(false)
  }, [media.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDragEnd = useCallback(() => {
    const currentY = y.get()
    // Snap open if dragged more than 40% of the way up from peek
    if (currentY < closedOffset * 0.6) {
      animate(y, 0, { type: 'spring', stiffness: 300, damping: 30 })
      setDrawerOpen(true)
    } else {
      animate(y, closedOffset, { type: 'spring', stiffness: 300, damping: 30 })
      setDrawerOpen(false)
    }
  }, [closedOffset, y])

  const sharedContentProps = {
    media,
    isEditing,
    isSaving,
    setIsEditing,
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    onSave,
  }

  // ── Desktop panel — always expanded, no collapse toggle ──────
  if (isDesktop) {
    return (
      // Floats as a card: margin creates breathing room from viewport edges.
      // Matches the mobile drawer's glassmorphism + ambient shadow language.
      <div className="flex flex-col shrink-0 w-80 my-4 mr-4">
        <div
          className={cn(
            'relative flex flex-col flex-1 h-full rounded-[24px] overflow-hidden',
            'bg-white/85 dark:bg-[#111214]/92 backdrop-blur-[16px]',
            'shadow-[0_20px_40px_rgba(26,28,28,0.08)]',
          )}
        >
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <PanelContent {...sharedContentProps} />
          </div>
        </div>

        <style jsx global>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 3px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(127, 87, 0, 0.12);
            border-radius: 10px;
          }
        `}</style>
      </div>
    )
  }

  // ── Mobile bottom drawer ────────────────────────────────────
  // The sheet has a fixed height of openHeight. It is anchored at the bottom of
  // its overflow-visible layout wrapper (which is PEEK_HEIGHT tall). Translating
  // y = closedOffset shows only the peek strip; y = 0 reveals the full sheet.
  return (
    <motion.div
      ref={drawerRef}
      drag="y"
      dragConstraints={{ top: 0, bottom: closedOffset }}
      dragElastic={0.05}
      style={{ y, height: openHeight }}
      onDragEnd={handleDragEnd}
      className="absolute bottom-0 left-0 right-0 z-20 rounded-t-[24px] overflow-hidden touch-none"
    >
      {/* Glassmorphism background */}
      <motion.div
        className="absolute inset-0 bg-white/85 dark:bg-[#111214]/92 backdrop-blur-[20px]"
        style={{ opacity }}
      />

      {/* Peek strip — always visible, anchors the drag gesture */}
      <div className="relative z-10 shrink-0" style={{ height: `${PEEK_HEIGHT}px` }}>
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-8 h-1 rounded-full bg-on-surface/20" />
        </div>
        {/* Peek content: filename + date */}
        <div className="flex items-center justify-between px-5">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-primary truncate">
              {media.title || media.filename || 'Untitled'}
            </p>
            <p className="text-[10px] text-on-surface/40 font-rubik">
              {formatDate(media.captureDate)}
            </p>
          </div>
          <button
            onClick={() => {
              if (drawerOpen) {
                animate(y, closedOffset, { type: 'spring', stiffness: 300, damping: 30 })
                setDrawerOpen(false)
              } else {
                animate(y, 0, { type: 'spring', stiffness: 300, damping: 30 })
                setDrawerOpen(true)
              }
            }}
            className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest font-rubik text-gallery-gold/80 shrink-0 ml-4"
          >
            {drawerOpen ? 'Close' : 'Details'}
            <ChevronRight
              size={11}
              className={cn('transition-transform duration-200', drawerOpen && 'rotate-90')}
            />
          </button>
        </div>
      </div>

      {/* Scrollable drawer content — height fills the rest of the sheet above the peek strip */}
      <div
        className="relative z-10 overflow-y-auto custom-scrollbar"
        style={{ height: openHeight - PEEK_HEIGHT }}
      >
        <PanelContent {...sharedContentProps} />
      </div>
    </motion.div>
  )
}
