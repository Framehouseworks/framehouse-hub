'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Plus, X, AlertTriangle } from 'lucide-react'
import { cn } from '@/utilities/cn'
import { toast } from 'sonner'
import { MediaPickerModal } from './MediaPickerModal'

interface AssetThumb {
  id: number
  url: string
  title?: string
}

interface ManualOverridesPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Collection ID whose manualIncludes/manualExcludes we're editing */
  collectionId: number
}

// ── Asset chip ────────────────────────────────────────────────────────────────
function AssetChip({
  asset,
  onRemove,
  variant,
}: {
  asset: AssetThumb
  onRemove: (id: number) => void
  variant: 'include' | 'exclude'
}) {
  return (
    <div
      className={cn(
        'relative group w-14 h-14 flex-shrink-0',
        variant === 'exclude' && 'opacity-60',
      )}
    >
      <div className="relative w-full h-full rounded-[12px] overflow-hidden bg-[#eeeeee]">
        {asset.url ? (
          <Image
            src={asset.url}
            alt={asset.title || `Asset ${asset.id}`}
            fill
            className="object-cover"
            sizes="56px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="font-rubik text-[8px] text-[#1a1c1c]/30">?</span>
          </div>
        )}
        {variant === 'exclude' && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#1a1c1c]/30">
            <span className="font-rubik text-[8px] bg-[#1a1c1c]/70 text-white px-1 rounded uppercase tracking-wider">
              EX
            </span>
          </div>
        )}
      </div>
      <button
        onClick={() => onRemove(asset.id)}
        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#1a1c1c] text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity shadow-sm"
        aria-label={`Remove ${asset.title || `asset ${asset.id}`}`}
      >
        <X size={10} />
      </button>
    </div>
  )
}

// ── Add button ────────────────────────────────────────────────────────────────
function AddChipButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-14 h-14 rounded-[12px] flex-shrink-0 flex items-center justify-center transition-colors',
        'bg-[#f3f3f4] hover:bg-gallery-gold/10',
        'text-[#1a1c1c]/30 hover:text-gallery-gold',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gallery-gold',
      )}
      aria-label={label}
    >
      <Plus size={16} />
    </button>
  )
}

// ── Panel content ─────────────────────────────────────────────────────────────
function PanelContent({ collectionId }: { collectionId: number }) {
  const [includes, setIncludes] = useState<AssetThumb[]>([])
  const [excludes, setExcludes] = useState<AssetThumb[]>([])
  const [loading, setLoading] = useState(true)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerMode, setPickerMode] = useState<'include' | 'exclude'>('include')
  const [isSaving, setIsSaving] = useState(false)

  // Load current includes/excludes from collection
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/smart-collections/${collectionId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return
        const mapAsset = (m: { id: number; thumbnailUrl?: string; proxyUrl?: string; originalUrl?: string; url?: string; title?: string }) => ({
          id: m.id,
          url: m.thumbnailUrl || m.proxyUrl || m.originalUrl || m.url || '',
          title: m.title,
        })
        setIncludes((data.manualIncludes || []).filter(Boolean).map(mapAsset))
        setExcludes((data.manualExcludes || []).filter(Boolean).map(mapAsset))
      })
      .catch(() => {/* silent */})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [collectionId])

  const saveToApi = useCallback(
    async (newIncludes: AssetThumb[], newExcludes: AssetThumb[]) => {
      setIsSaving(true)
      try {
        const res = await fetch(`/api/smart-collections/${collectionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            manualIncludes: newIncludes.map((a) => a.id),
            manualExcludes: newExcludes.map((a) => a.id),
          }),
        })
        if (!res.ok) throw new Error('Save failed')
      } catch {
        toast.error('Failed to save overrides')
      } finally {
        setIsSaving(false)
      }
    },
    [collectionId],
  )

  const handleRemoveInclude = useCallback(
    (id: number) => {
      setIncludes((prev) => {
        const next = prev.filter((a) => a.id !== id)
        saveToApi(next, excludes)
        return next
      })
    },
    [excludes, saveToApi],
  )

  const handleRemoveExclude = useCallback(
    (id: number) => {
      setExcludes((prev) => {
        const next = prev.filter((a) => a.id !== id)
        saveToApi(includes, next)
        return next
      })
    },
    [includes, saveToApi],
  )

  const openPicker = (mode: 'include' | 'exclude') => {
    setPickerMode(mode)
    setPickerOpen(true)
  }

  const handlePickerConfirm = useCallback(
    async (selectedIds: number[]) => {
      // Fetch thumb data for newly selected assets
      const newAssets: AssetThumb[] = await Promise.all(
        selectedIds.map(async (id) => {
          try {
            const res = await fetch(`/api/media/${id}`)
            if (!res.ok) return { id, url: '' }
            const m = await res.json()
            return {
              id: m.id,
              url: m.thumbnailUrl || m.proxyUrl || m.originalUrl || m.url || '',
              title: m.title,
            }
          } catch {
            return { id, url: '' }
          }
        }),
      )

      if (pickerMode === 'include') {
        setIncludes((prev) => {
          const existingIds = new Set(prev.map((a) => a.id))
          const merged = [...prev, ...newAssets.filter((a) => !existingIds.has(a.id))]
          saveToApi(merged, excludes)
          return merged
        })
      } else {
        setExcludes((prev) => {
          const existingIds = new Set(prev.map((a) => a.id))
          const merged = [...prev, ...newAssets.filter((a) => !existingIds.has(a.id))]
          saveToApi(includes, merged)
          return merged
        })
      }
      toast.success(
        `${selectedIds.length} asset${selectedIds.length > 1 ? 's' : ''} ${pickerMode === 'include' ? 'added to include list' : 'added to exclude list'}`,
      )
    },
    [pickerMode, includes, excludes, saveToApi],
  )

  const conflicts = includes.filter((inc) => excludes.some((exc) => exc.id === inc.id))
  const alreadyInPicker =
    pickerMode === 'include' ? includes.map((a) => a.id) : excludes.map((a) => a.id)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="text-sm text-[#1a1c1c]/40">Loading…</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6" aria-busy={isSaving}>
      {conflicts.length > 0 && (
        <div className="flex items-start gap-2 bg-[#d79922]/10 rounded-[12px] px-3 py-2.5">
          <AlertTriangle size={14} className="text-[#d79922] flex-shrink-0 mt-0.5" />
          <p className="text-xs text-[#1a1c1c]/70">
            {conflicts.length} asset{conflicts.length > 1 ? 's' : ''} in both lists. Exclusions
            take priority.
          </p>
        </div>
      )}

      {/* Always Include */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[#1a1c1c]">Always Include</h3>
          <span className="font-rubik text-[10px] uppercase tracking-widest text-[#1a1c1c]/30">
            {includes.length} ASSETS
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {includes.map((asset) => (
            <AssetChip key={asset.id} asset={asset} onRemove={handleRemoveInclude} variant="include" />
          ))}
          <AddChipButton onClick={() => openPicker('include')} label="Add assets to always include" />
        </div>
        {includes.length === 0 && (
          <p className="mt-2 text-xs text-[#1a1c1c]/30 italic">
            Assets pinned here always appear in this collection, regardless of rules.
          </p>
        )}
      </section>

      {/* Always Exclude */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[#1a1c1c]">Always Exclude</h3>
          <span className="font-rubik text-[10px] uppercase tracking-widest text-[#1a1c1c]/30">
            {excludes.length} ASSETS
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {excludes.map((asset) => (
            <AssetChip key={asset.id} asset={asset} onRemove={handleRemoveExclude} variant="exclude" />
          ))}
          <AddChipButton onClick={() => openPicker('exclude')} label="Add assets to always exclude" />
        </div>
        {excludes.length === 0 && (
          <p className="mt-2 text-xs text-[#1a1c1c]/30 italic">
            Assets blocked here are hidden from this collection even if rules match.
          </p>
        )}
      </section>

      <MediaPickerModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        mode={pickerMode}
        alreadySelected={alreadyInPicker}
        onConfirm={handlePickerConfirm}
      />
    </div>
  )
}

// ── Public component ──────────────────────────────────────────────────────────
export function ManualOverridesPanel({ open, onOpenChange, collectionId }: ManualOverridesPanelProps) {
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  const inner = <PanelContent collectionId={collectionId} />

  if (isDesktop) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-[420px] bg-white/90 backdrop-blur-[20px] border-0 flex flex-col gap-0 p-0"
        >
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-[#f3f3f4]">
            <SheetTitle className="text-base font-semibold text-[#1a1c1c]">
              Manage Assets
            </SheetTitle>
            <p className="text-xs text-[#1a1c1c]/40 mt-1">
              Pin or block specific assets independently of collection rules.
            </p>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5">{inner}</div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-[24px] bg-white/90 backdrop-blur-[20px] border-0 flex flex-col gap-0 p-0 max-h-[85dvh]"
      >
        <div className="mx-auto w-12 h-1.5 bg-[#eeeeee] rounded-full mt-3 mb-0 flex-shrink-0" />
        <SheetHeader className="px-5 pt-4 pb-4 border-b border-[#f3f3f4] flex-shrink-0">
          <SheetTitle className="text-base font-semibold text-[#1a1c1c]">
            Manage Assets
          </SheetTitle>
          <p className="text-xs text-[#1a1c1c]/40 mt-1">
            Pin or block specific assets independently of collection rules.
          </p>
        </SheetHeader>
        <div
          className="flex-1 overflow-y-auto px-5 py-5"
          style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
        >
          {inner}
        </div>
      </SheetContent>
    </Sheet>
  )
}
