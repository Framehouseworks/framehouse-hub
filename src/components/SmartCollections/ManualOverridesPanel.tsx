'use client'

import Image from 'next/image'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Plus, X } from 'lucide-react'
import { cn } from '@/utilities/cn'

interface AssetThumb {
  id: number | string
  url: string
  name?: string
}

interface ManualOverridesPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  includes: AssetThumb[]
  excludes: AssetThumb[]
  onAddInclude: () => void
  onAddExclude: () => void
  onRemoveInclude: (id: number | string) => void
  onRemoveExclude: (id: number | string) => void
}

function AssetChip({
  asset,
  onRemove,
  isExcluded,
}: {
  asset: AssetThumb
  onRemove: (id: number | string) => void
  isExcluded?: boolean
}) {
  return (
    <div className={cn('relative group w-14 h-14', isExcluded && 'opacity-50')}>
      <div className="relative w-full h-full rounded-[12px] overflow-hidden bg-[#eeeeee]">
        {asset.url && (
          <Image src={asset.url} alt={asset.name || ''} fill className="object-cover" sizes="56px" />
        )}
      </div>
      {isExcluded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-rubik text-[8px] bg-[#1a1c1c]/70 text-white px-1 rounded uppercase tracking-wider">
            EX
          </span>
        </div>
      )}
      <button
        onClick={() => onRemove(asset.id)}
        className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#1a1c1c] text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label={`Remove ${asset.name || 'asset'}`}
      >
        <X size={10} />
      </button>
    </div>
  )
}

export function ManualOverridesPanel({
  open,
  onOpenChange,
  includes,
  excludes,
  onAddInclude,
  onAddExclude,
  onRemoveInclude,
  onRemoveExclude,
}: ManualOverridesPanelProps) {
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  const conflicts = includes.filter((inc) => excludes.some((exc) => exc.id === inc.id))

  const content = (
    <div className="flex flex-col gap-6 pb-[env(safe-area-inset-bottom)]">
      {conflicts.length > 0 && (
        <div className="bg-[#d79922]/10 rounded-[12px] px-3 py-2 text-xs text-[#1a1c1c]/70">
          {conflicts.length} asset{conflicts.length > 1 ? 's' : ''} appear in both lists. Exclusions take priority.
        </div>
      )}

      {/* Always Include */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-[#1a1c1c]">Always Include</h3>
        <div className="flex flex-wrap gap-2">
          {includes.map((asset) => (
            <AssetChip key={asset.id} asset={asset} onRemove={onRemoveInclude} />
          ))}
          <button
            onClick={onAddInclude}
            className="w-14 h-14 rounded-[12px] border-2 border-dashed border-[#d5c4af]/40 hover:border-gallery-gold/40 flex items-center justify-center transition-colors"
            aria-label="Add asset to always include"
          >
            <Plus size={16} className="text-[#1a1c1c]/30 hover:text-gallery-gold" />
          </button>
        </div>
        {includes.length === 0 && (
          <p className="text-xs text-[#1a1c1c]/30 italic">No overrides set</p>
        )}
      </div>

      {/* Always Exclude */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-[#1a1c1c]">Always Exclude</h3>
        <div className="flex flex-wrap gap-2">
          {excludes.map((asset) => (
            <AssetChip key={asset.id} asset={asset} onRemove={onRemoveExclude} isExcluded />
          ))}
          <button
            onClick={onAddExclude}
            className="w-14 h-14 rounded-[12px] border-2 border-dashed border-[#d5c4af]/40 hover:border-gallery-gold/40 flex items-center justify-center transition-colors"
            aria-label="Add asset to always exclude"
          >
            <Plus size={16} className="text-[#1a1c1c]/30 hover:text-gallery-gold" />
          </button>
        </div>
        {excludes.length === 0 && (
          <p className="text-xs text-[#1a1c1c]/30 italic">No exclusions set</p>
        )}
      </div>
    </div>
  )

  if (isDesktop) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-[480px] bg-white/90 backdrop-blur-[20px] border-0">
          <SheetHeader>
            <SheetTitle className="text-base font-semibold text-[#1a1c1c]">Manual Overrides</SheetTitle>
          </SheetHeader>
          <div className="mt-6">{content}</div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-[24px] bg-white/90 backdrop-blur-[20px] border-0 max-h-[80vh] overflow-y-auto pb-safe">
        <div className="mx-auto w-12 h-1.5 bg-[#eeeeee] rounded-full mb-4" />
        <SheetHeader>
          <SheetTitle className="text-base font-semibold text-[#1a1c1c]">Manual Overrides</SheetTitle>
        </SheetHeader>
        <div className="mt-6">{content}</div>
      </SheetContent>
    </Sheet>
  )
}
