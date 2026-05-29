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
  ChevronRight,
  ShieldCheck,
  Crosshair,
} from 'lucide-react'
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
  animate,
  useDragControls,
} from 'framer-motion'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import type { Media } from '@/payload-types'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { LocationSearch, OsmMiniMap } from '@/components/ui/location-search'
import { updateMediaAction } from '@/app/(dashboard)/actions/media'
import { cn } from '@/utilities/cn'
import { getPlainTextFromLexical, convertTextToLexical } from '@/lib/lexical-utils'
import { TagInput } from '@/components/ui/tag-input'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'

// ─── Types ─────────────────────────────────────────────────────────────────

interface RefinementFormData {
  title: string
  alt: string
  captionText: string
  tags: string[]
  captureDate: string
  locationAddress: string
  locationLat: number | null
  locationLng: number | null
  cameraMake: string
  cameraModel: string
  lensModel: string
  iso: number | string
  aperture: number | string
  shutterSpeed: string
  focalLength: number | string
  sessionId?: number
}

interface MetadataPanelProps {
  media: Media
  /** true → right-side collapsible panel; false → mobile bottom drawer */
  isDesktop: boolean
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return '--'
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function formatMimeType(mime: string | null | undefined): string {
  if (!mime) return '--'
  // e.g. "image/jpeg" → "JPEG", "image/x-canon-cr3" → "CR3"
  const sub = mime.split('/')[1] || mime
  return sub.replace(/^x-[^-]+-/, '').toUpperCase()
}

function formatMediaType(t: string | null | undefined): string {
  if (!t) return ''
  return t.charAt(0).toUpperCase() + t.slice(1)
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '--'
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '--'
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ─── Fade Value ─────────────────────────────────────────────────────────────
// Fades in when mediaId changes. No exit — structure stays, only text refreshes.

const FadeValue: React.FC<{
  mediaId: string | number
  children: React.ReactNode
  className?: string
  as?: 'span' | 'div' | 'p'
}> = ({ mediaId, children, className, as: Tag = 'span' }) => (
  <motion.span
    key={mediaId}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.2, ease: 'easeOut' }}
    className={className}
    // motion.span ignores `as` — render the right tag via asChild pattern
    style={{ display: Tag === 'span' ? 'inline' : 'block' }}
  >
    {children}
  </motion.span>
)

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

const StatTile: React.FC<{
  label: string
  value: string | number | null | undefined
  wide?: boolean
  mediaId?: string | number
}> = ({ label, value, wide, mediaId }) => (
  <div className={cn('bg-black/[0.03] dark:bg-white/[0.03] p-3 rounded-2xl', wide && 'col-span-2')}>
    <span className="text-[8px] font-bold tracking-[0.18em] text-on-surface/25 uppercase block mb-1">
      {label}
    </span>
    {mediaId !== undefined ? (
      <FadeValue
        mediaId={mediaId}
        className="text-[10px] font-bold font-rubik text-primary break-all leading-snug block"
      >
        {value || '--'}
      </FadeValue>
    ) : (
      <p className="text-[10px] font-bold font-rubik text-primary break-all leading-snug">
        {value || '--'}
      </p>
    )}
  </div>
)

// ─── Panel Content ──────────────────────────────────────────────────────────

const PanelContent: React.FC<{
  media: Media
  mediaId: string | number
  isEditing: boolean
  isSaving: boolean
  setIsEditing: (v: boolean) => void
  register: ReturnType<typeof useForm<RefinementFormData>>['register']
  handleSubmit: ReturnType<typeof useForm<RefinementFormData>>['handleSubmit']
  reset: ReturnType<typeof useForm<RefinementFormData>>['reset']
  watch: ReturnType<typeof useForm<RefinementFormData>>['watch']
  setValue: ReturnType<typeof useForm<RefinementFormData>>['setValue']
  onSave: (data: RefinementFormData, sessionId?: number) => void
}> = ({
  media,
  mediaId,
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
  const [sessionOptions, setSessionOptions] = useState<ComboboxOption[]>([])
  const [sessionId, setSessionId] = useState<number | undefined>(
    typeof media.session === 'object' && media.session !== null
      ? (media.session as { id: number }).id
      : typeof media.session === 'number'
        ? media.session
        : undefined,
  )
  const [sessionName, setSessionName] = useState<string>(
    typeof media.session === 'object' && media.session !== null
      ? ((media.session as { name?: string }).name ?? '')
      : media.shootName ?? '',
  )

  useEffect(() => {
    if (!isEditing) return
    fetch('/api/sessions?limit=50&depth=0&sort=-createdAt', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        const docs: { id: number; name: string }[] = data?.docs ?? []
        setSessionOptions(docs.map((s) => ({ value: String(s.id), label: s.name })))
      })
      .catch(() => {})
  }, [isEditing])

  const hasExif =
    media.technical?.iso ||
    media.technical?.aperture ||
    media.technical?.shutterSpeed ||
    media.technical?.focalLength

  const hasGps =
    typeof media.location?.latitude === 'number' && typeof media.location?.longitude === 'number'

  return (
    <div className="space-y-5 p-5 pb-10">
      {/* ── Identity ──────────────────────────────────────────── */}
      <div className="space-y-2.5">
        {/* Accession + media type badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={11} className="text-gallery-gold shrink-0" />
            <span className="text-[9px] font-bold tracking-[0.18em] uppercase font-rubik text-gallery-gold">
              {media.accessionId || 'Pending Accession'}
            </span>
          </div>
          {media.mediaType && media.mediaType !== 'unclassified' && (
            <span className="text-[8px] font-bold tracking-widest uppercase font-rubik px-2 py-0.5 rounded-lg bg-on-surface/[0.06] text-on-surface/40">
              {formatMediaType(media.mediaType)}
            </span>
          )}
          {media.ingestionStatus === 'processing' && (
            <span className="text-[8px] font-bold tracking-widest uppercase font-rubik px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-500/80">
              Processing
            </span>
          )}
        </div>

        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-1">
            {isEditing ? (
              <input
                {...register('title', { required: true })}
                placeholder="Asset title…"
                className="w-full bg-black/[0.04] dark:bg-white/[0.04] rounded-2xl px-4 py-2.5 text-base font-semibold focus:outline-none focus:ring-1 focus:ring-gallery-gold/50 transition-all text-primary"
              />
            ) : (
              <FadeValue
                mediaId={mediaId}
                as="div"
                className="text-base font-semibold tracking-tight text-primary break-words leading-snug"
              >
                {media.title || media.filename || 'Untitled'}
              </FadeValue>
            )}
            {/* Original filename — useful archival reference */}
            {!isEditing && media.originalFilename && media.originalFilename !== media.title && (
              <FadeValue
                mediaId={mediaId}
                as="p"
                className="text-[10px] text-on-surface/35 font-rubik break-all leading-snug block"
              >
                {media.originalFilename}
              </FadeValue>
            )}
            {/* Session link — view mode */}
            {!isEditing && (media.shootName || sessionName) && (
              <div className="flex items-center gap-1.5 pt-0.5">
                <Camera size={9} className="text-on-surface/30 shrink-0" />
                <FadeValue mediaId={mediaId} className="text-[10px] text-on-surface/45 font-medium break-words">
                  {sessionName || media.shootName}
                </FadeValue>
              </div>
            )}
            {/* Session combobox — edit mode */}
            {isEditing && (
              <div className="pt-1 space-y-1">
                <label className="text-[9px] font-bold tracking-widest text-on-surface/30 uppercase font-rubik flex items-center gap-1">
                  <Camera size={9} />
                  Session
                </label>
                <Combobox
                  options={sessionOptions}
                  value={sessionId ? String(sessionId) : undefined}
                  onChange={async (value, isNew) => {
                    if (isNew) {
                      try {
                        const res = await fetch('/api/sessions', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({ name: value }),
                        })
                        if (!res.ok) throw new Error()
                        const data = await res.json()
                        const s = data?.doc ?? data
                        setSessionOptions((prev) => [{ value: String(s.id), label: s.name }, ...prev])
                        setSessionId(s.id)
                        setSessionName(s.name)
                      } catch { /* non-fatal */ }
                    } else {
                      const opt = sessionOptions.find((o) => o.value === value)
                      setSessionId(Number(value))
                      setSessionName(opt?.label ?? '')
                    }
                  }}
                  placeholder="Assign to session…"
                  allowCreate
                  createLabel={(v) => `Create "${v}"`}
                  aria-label="Session"
                />
              </div>
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

      {/* ── File Stats — 2×2 grid, no truncation ──────────────── */}
      <div className="grid grid-cols-2 gap-2">
        <StatTile
          mediaId={mediaId}
          label="Resolution"
          value={media.width && media.height ? `${media.width} × ${media.height}` : null}
        />
        <StatTile mediaId={mediaId} label="Format" value={formatMimeType(media.mimeType)} />
        <StatTile mediaId={mediaId} label="File Size" value={formatFileSize(media.filesize)} />
        <StatTile mediaId={mediaId} label="Aspect" value={media.aspectRatio} />
      </div>

      {/* ── Technical / Optics ────────────────────────────────── */}
      <div className="space-y-2.5">
        <SectionLabel icon={<Camera size={12} />}>Optics</SectionLabel>
        <div className="bg-black/[0.03] dark:bg-white/[0.03] rounded-[20px] p-3.5 space-y-2">
          {isEditing ? (
            <div className="space-y-2">
              <input
                {...register('cameraMake')}
                placeholder="Manufacturer (e.g. Sony, Canon)"
                className="w-full bg-white/60 dark:bg-white/[0.04] rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-gallery-gold/50 text-primary"
              />
              <input
                {...register('cameraModel')}
                placeholder="Camera model (e.g. A7R V)"
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
              {/* Make + Model row */}
              <div className="flex flex-col gap-0.5">
                {(media.technical as { cameraMake?: string } | null)?.cameraMake && (
                  <FadeValue
                    mediaId={mediaId}
                    as="p"
                    className="text-[9px] font-bold tracking-widest uppercase font-rubik text-gallery-gold/70 block"
                  >
                    {(media.technical as { cameraMake?: string }).cameraMake}
                  </FadeValue>
                )}
                <FadeValue
                  mediaId={mediaId}
                  as="p"
                  className="text-sm font-semibold leading-snug break-words block"
                >
                  {media.technical?.cameraModel || (
                    <span className="text-on-surface/30 font-normal text-xs">Unknown Body</span>
                  )}
                </FadeValue>
              </div>
              {media.technical?.lensModel && (
                <FadeValue
                  mediaId={mediaId}
                  as="p"
                  className="text-[10px] text-on-surface/50 leading-snug break-words block"
                >
                  {media.technical.lensModel}
                </FadeValue>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Exposure ──────────────────────────────────────────── */}
      <div className="space-y-2.5">
        <SectionLabel icon={<Zap size={12} />}>Exposure</SectionLabel>
        {isEditing ? (
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { field: 'iso' as const, label: 'ISO', placeholder: '100' },
                { field: 'aperture' as const, label: 'Aperture', placeholder: '2.8' },
                { field: 'shutterSpeed' as const, label: 'Shutter', placeholder: '1/250' },
                { field: 'focalLength' as const, label: 'Focal Length', placeholder: '50mm' },
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
        ) : hasExif ? (
          <div className="grid grid-cols-2 gap-2">
            {[
              {
                label: 'ISO',
                value: media.technical?.iso ? `ISO ${media.technical.iso}` : null,
              },
              {
                label: 'Aperture',
                value: media.technical?.aperture ? `f/${media.technical.aperture}` : null,
              },
              { label: 'Shutter', value: media.technical?.shutterSpeed || null },
              {
                label: 'Focal',
                value: media.technical?.focalLength ? `${media.technical.focalLength}mm` : null,
              },
            ]
              .filter((x) => x.value)
              .map((x, i) => (
                <div key={i} className="bg-black/[0.03] dark:bg-white/[0.03] rounded-xl px-3 py-2">
                  <span className="text-[8px] font-bold tracking-widest text-on-surface/25 uppercase block mb-0.5">
                    {x.label}
                  </span>
                  <FadeValue
                    mediaId={mediaId}
                    className="text-[10px] font-bold font-rubik text-primary"
                  >
                    {x.value}
                  </FadeValue>
                </div>
              ))}
          </div>
        ) : (
          <FadeValue mediaId={mediaId} className="text-[10px] text-on-surface/30 font-rubik">
            No EXIF data
          </FadeValue>
        )}
      </div>

      {/* ── Tags ──────────────────────────────────────────────── */}
      <div className="space-y-2.5">
        <SectionLabel icon={<TagIcon size={12} />}>Tags</SectionLabel>
        {isEditing ? (
          <TagInput
            tags={currentTags}
            onChange={(tags) => setValue('tags', tags, { shouldDirty: true })}
            placeholder="Add tag…"
            maxTags={20}
          />
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {((media.manualTags || []).map((t) => t.tag).filter(Boolean) as string[]).map((tag, i) => (
              <div
                key={i}
                className="h-6 px-3 rounded-xl bg-black/[0.04] dark:bg-white/[0.04] text-[10px] font-medium flex items-center text-on-surface/70"
              >
                {tag}
              </div>
            ))}
            {(media.manualTags?.length ?? 0) === 0 && (
              <span className="text-[10px] text-on-surface/30 font-rubik">No tags</span>
            )}
          </div>
        )}

        {/* Heuristic / system tags */}
        {(media.heuristicTags?.length ?? 0) > 0 && !isEditing && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {media.heuristicTags!.map((t, i) => (
              <div
                key={i}
                className="h-6 px-3 rounded-xl bg-gallery-gold/[0.05] text-[10px] font-medium text-gallery-gold/50 flex items-center italic"
              >
                {t.tag}
              </div>
            ))}
          </div>
        )}
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
            <FadeValue
              mediaId={mediaId}
              as="p"
              className="text-xs text-on-surface/60 leading-relaxed block"
            >
              {getPlainTextFromLexical(media.caption)}
            </FadeValue>
          )}
        </div>
      )}

      {/* ── Timeline & Origin ─────────────────────────────────── */}
      <div className="bg-black/[0.02] dark:bg-white/[0.02] rounded-[20px] p-4 space-y-3">
        {/* Capture date */}
        <div className="space-y-1">
          <SectionLabel icon={<Calendar size={12} />}>Capture</SectionLabel>
          {isEditing ? (
            <DatePicker
              value={watch('captureDate')}
              onChange={(iso) => setValue('captureDate', iso ?? '')}
            />
          ) : (
            <FadeValue mediaId={mediaId} className="text-[10px] font-bold font-rubik text-primary">
              {formatDate(media.captureDate)}
            </FadeValue>
          )}
        </div>

        {/* Location */}
        <div className="space-y-1">
          <SectionLabel icon={<MapPin size={12} />}>Location</SectionLabel>
          {isEditing ? (
            <LocationSearch
              value={watch('locationAddress')}
              onChange={(addr) => setValue('locationAddress', addr)}
              onLocationSelect={(result) => {
                const [lon, lat] = result.geometry.coordinates
                const name = [
                  result.properties.name,
                  result.properties.street,
                  result.properties.city,
                  result.properties.state,
                  result.properties.country,
                ]
                  .filter(Boolean)
                  .join(', ')
                setValue('locationAddress', name)
                setValue('locationLat', lat)
                setValue('locationLng', lon)
              }}
              hasExistingGps={hasGps}
            />
          ) : (
            <div className="space-y-0.5">
              <FadeValue
                mediaId={mediaId}
                as="p"
                className="text-[10px] font-bold text-primary leading-snug break-words block"
              >
                {media.location?.address || '--'}
              </FadeValue>
              {hasGps && (
                <FadeValue
                  mediaId={mediaId}
                  as="p"
                  className="text-[9px] text-on-surface/30 font-rubik block"
                >
                  <Crosshair size={8} className="inline mr-1 opacity-60" />
                  {media.location!.latitude!.toFixed(4)}, {media.location!.longitude!.toFixed(4)}
                </FadeValue>
              )}
              {hasGps && (
                <OsmMiniMap lat={media.location!.latitude!} lon={media.location!.longitude!} />
              )}
            </div>
          )}
        </div>

        {/* Ingested */}
        <div className="flex items-center justify-between">
          <SectionLabel>Ingested</SectionLabel>
          <FadeValue
            mediaId={mediaId}
            className="text-[10px] font-bold font-rubik text-on-surface/40"
          >
            {formatDateTime(media.createdAt)}
          </FadeValue>
        </div>

        {/* Last updated — only show if different from created */}
        {media.updatedAt && media.updatedAt !== media.createdAt && (
          <div className="flex items-center justify-between">
            <SectionLabel>Updated</SectionLabel>
            <FadeValue
              mediaId={mediaId}
              className="text-[10px] font-bold font-rubik text-on-surface/30"
            >
              {formatDateTime(media.updatedAt)}
            </FadeValue>
          </div>
        )}
      </div>

      {/* ── Edit Action Footer ────────────────────────────────── */}
      {isEditing && (
        <div className="space-y-2 pt-1">
          <Button
            className="w-full h-11 rounded-2xl bg-gallery-gold text-white hover:bg-gallery-gold/90 shadow-lg shadow-gallery-gold/20 font-rubik text-[9px] font-bold uppercase tracking-[0.2em] transition-all"
            onClick={handleSubmit((data) => onSave(data, sessionId))}
            disabled={isSaving}
          >
            {isSaving ? 'Saving…' : 'Commit Changes'}
            <ArrowRight size={13} className="ml-2" />
          </Button>
          <Button
            variant="ghost"
            className="w-full h-11 rounded-2xl text-on-surface/40 hover:text-primary font-rubik text-[9px] font-bold uppercase tracking-[0.2em]"
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

  // Mobile drawer — three snap points: closed (peek) / mid (~55 vh) / full (~95 vh)
  type DrawerSnap = 'closed' | 'mid' | 'full'
  const drawerRef = useRef<HTMLDivElement | null>(null)
  const scrollableRef = useRef<HTMLDivElement>(null)
  const [snap, setSnap] = useState<DrawerSnap>('closed')

  // Real viewport height — updated on resize/orientation change
  const [viewportHeight, setViewportHeight] = useState(() =>
    typeof window !== 'undefined' ? window.innerHeight : 800,
  )
  useEffect(() => {
    const update = () => setViewportHeight(window.innerHeight)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // Snap y positions (sheet anchored at bottom; y=0 → sheet top flush with page top)
  const drawerHeight = Math.round(viewportHeight * 0.95)
  const SNAP_FULL = 0 // 95 vh content
  const SNAP_MID = drawerHeight - Math.round(viewportHeight * 0.55) // 55 vh content
  const SNAP_CLOSED = drawerHeight - PEEK_HEIGHT // peek only

  // Stable refs so effects/handlers always read the latest values without re-subscribing
  const snapValuesRef = useRef({ SNAP_FULL, SNAP_MID, SNAP_CLOSED })
  snapValuesRef.current = { SNAP_FULL, SNAP_MID, SNAP_CLOSED }
  const snapStateRef = useRef<DrawerSnap>('closed')

  // Initialise in the peek (closed) position
  const y = useMotionValue(SNAP_CLOSED)

  const { register, handleSubmit, reset, setValue, watch } = useForm<RefinementFormData>()

  // Sync form with media when it changes
  useEffect(() => {
    reset({
      title: media.title || '',
      alt: media.alt || '',
      captionText: getPlainTextFromLexical(media.caption),
      tags: media.manualTags?.map((t) => t.tag).filter((t): t is string => !!t) || [],
      captureDate: media.captureDate ? new Date(media.captureDate).toISOString() : '',
      locationAddress: media.location?.address || '',
      locationLat: media.location?.latitude ?? null,
      locationLng: media.location?.longitude ?? null,
      cameraMake: (media.technical as { cameraMake?: string } | null)?.cameraMake || '',
      cameraModel: media.technical?.cameraModel || '',
      lensModel: media.technical?.lensModel || '',
      iso: media.technical?.iso ?? '',
      aperture: media.technical?.aperture ?? '',
      shutterSpeed: media.technical?.shutterSpeed || '',
      focalLength: media.technical?.focalLength ?? '',
    })
    setIsEditing(false)
  }, [media.id, reset]) // eslint-disable-line react-hooks/exhaustive-deps

  const onSave = async (data: RefinementFormData, sessionId?: number) => {
    setIsSaving(true)
    try {
      const result = await updateMediaAction(media.id, {
        title: data.title,
        alt: data.alt,
        caption: convertTextToLexical(data.captionText),
        manualTags: data.tags.map((t) => ({ tag: t })),
        captureDate: data.captureDate ? new Date(data.captureDate).toISOString() : null,
        technical: {
          cameraMake: data.cameraMake,
          cameraModel: data.cameraModel,
          lensModel: data.lensModel,
          iso: data.iso ? Number(data.iso) : null,
          aperture: data.aperture ? Number(data.aperture) : null,
          shutterSpeed: data.shutterSpeed,
          focalLength: data.focalLength ? Number(data.focalLength) : null,
        },
        location: {
          address: data.locationAddress,
          latitude: data.locationLat,
          longitude: data.locationLng,
        },
        ...(sessionId ? { session: sessionId } : {}),
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

  // opacity: fully opaque at full/mid, slightly translucent at peek
  const opacity = useTransform(y, [SNAP_FULL, SNAP_CLOSED], [1, 0.82])

  // Scroll container height = exactly the visible slice of the drawer above the peek strip.
  // The motion.div uses translateY, so its bottom sits below the viewport at mid/closed.
  // Without this, the fixed-height container extends off-screen and content is unreachable.
  const scrollContainerHeight = useTransform(y, (yVal) =>
    Math.max(0, drawerHeight - yVal - PEEK_HEIGHT),
  )

  // Stable snap helper — reads latest snap positions from ref, no re-subscription needed
  const snapTo = useCallback(
    (target: DrawerSnap) => {
      const { SNAP_FULL: f, SNAP_MID: m, SNAP_CLOSED: c } = snapValuesRef.current
      const yVal = target === 'full' ? f : target === 'mid' ? m : c
      animate(y, yVal, { type: 'spring', stiffness: 300, damping: 30 })
      setSnap(target)
      snapStateRef.current = target
    },
    [y],
  )

  // Re-anchor sheet instantly on viewport resize (rotation, browser-chrome show/hide)
  useEffect(() => {
    const { SNAP_FULL: f, SNAP_MID: m, SNAP_CLOSED: c } = snapValuesRef.current
    const yVal = snapStateRef.current === 'full' ? f : snapStateRef.current === 'mid' ? m : c
    animate(y, yVal, { duration: 0 })
  }, [SNAP_CLOSED, y])

  // Reset to peek whenever the displayed asset changes
  useEffect(() => {
    snapTo('closed')
  }, [media.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Three-way snap: nearest snap point on drag release
  const handleDragEnd = useCallback(() => {
    const currentY = y.get()
    const { SNAP_FULL: f, SNAP_MID: m, SNAP_CLOSED: c } = snapValuesRef.current
    if (currentY <= (f + m) / 2) {
      snapTo('full')
    } else if (currentY <= (m + c) / 2) {
      snapTo('mid')
    } else {
      snapTo('closed')
    }
  }, [snapTo, y])

  // Virtual keyboard avoidance:
  // When the OS keyboard opens, visualViewport.height shrinks. We expand the
  // drawer to full so the focused field isn't hidden behind the keyboard, then
  // scroll it into view within the scrollable container.
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const handleVVResize = () => {
      const keyboardHeight = window.innerHeight - vv.height - vv.offsetTop
      if (keyboardHeight > 150) {
        if (snapStateRef.current !== 'full') snapTo('full')
        requestAnimationFrame(() => {
          const el = document.activeElement
          if (el instanceof HTMLElement && scrollableRef.current?.contains(el)) {
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
          }
        })
      }
    }
    vv.addEventListener('resize', handleVVResize)
    return () => vv.removeEventListener('resize', handleVVResize)
  }, [snapTo])

  // Drag initiated only from the peek strip — scrollable content is untouched
  const dragControls = useDragControls()

  const sharedContentProps = {
    media,
    mediaId: media.id,
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
      <div className="flex flex-col shrink-0 w-96 my-4 mr-4">
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
      dragControls={dragControls}
      dragListener={false}
      dragConstraints={{ top: SNAP_FULL, bottom: SNAP_CLOSED }}
      dragElastic={0.05}
      style={{ y, height: drawerHeight }}
      onDragEnd={handleDragEnd}
      className="absolute bottom-0 left-0 right-0 z-20 rounded-t-[24px] overflow-hidden"
    >
      {/* Glassmorphism background */}
      <motion.div
        className="absolute inset-0 bg-white/85 dark:bg-[#111214]/92 backdrop-blur-[20px]"
        style={{ opacity }}
      />

      {/* Peek strip — drag source only; touch-none scoped here so scroll is free below */}
      <div
        className="relative z-10 shrink-0"
        style={{ height: `${PEEK_HEIGHT}px`, touchAction: 'none' }}
        onPointerDown={(e) => dragControls.start(e)}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-8 h-1 rounded-full bg-on-surface/20" />
        </div>
        {/* Peek content: filename + date — fades on asset switch */}
        <div className="flex items-center justify-between px-5">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={media.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12, ease: 'easeInOut' }}
              className="min-w-0 flex-1"
            >
              <p className="text-sm font-semibold text-primary truncate">
                {media.title || media.filename || 'Untitled'}
              </p>
              <p className="text-[10px] text-on-surface/40 font-rubik">
                {formatDate(media.captureDate)}
              </p>
            </motion.div>
          </AnimatePresence>
          <div className="flex items-center gap-3 shrink-0 ml-4">
            {!isEditing && (
              <button
                onClick={() => {
                  snapTo('mid')
                  setIsEditing(true)
                }}
                className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest font-rubik text-on-surface/40 hover:text-gallery-gold transition-colors"
              >
                <Edit3 size={11} />
                Edit
              </button>
            )}
            <button
              onClick={() => snapTo(snap === 'closed' ? 'mid' : 'closed')}
              className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest font-rubik text-gallery-gold/80"
            >
              {snap !== 'closed' ? 'Close' : 'Details'}
              <ChevronRight
                size={11}
                className={cn(
                  'transition-transform duration-200',
                  snap !== 'closed' && 'rotate-90',
                )}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable drawer content — height tracks the live visible slice via MotionValue.
          This prevents content from sitting off-screen below the viewport when translated. */}
      <motion.div
        ref={scrollableRef}
        className="relative z-10 overflow-y-auto custom-scrollbar"
        style={{ height: scrollContainerHeight, overscrollBehavior: 'contain' }}
      >
        <PanelContent {...sharedContentProps} />
      </motion.div>
    </motion.div>
  )
}
