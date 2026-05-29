'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, MoreHorizontal, Settings } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/utilities/cn'
import { CollectionRuleEditor } from './CollectionRuleEditor'
import type { CollectionCardData } from './CollectionCard'
import { summariseFilter } from './CollectionCard'
import { toast } from 'sonner'

interface CollectionDetailHeaderProps {
  collection: CollectionCardData & { assetCount: number; updatedAt?: string }
}

const RECENT_KEY = 'fh_recent_collections'

export function CollectionDetailHeader({ collection }: CollectionDetailHeaderProps) {
  const router = useRouter()
  const [editorOpen, setEditorOpen] = useState(false)

  // Track this collection as recently viewed
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY)
      const ids: number[] = raw ? (JSON.parse(raw) as number[]) : []
      const updated = [collection.id, ...ids.filter((id) => id !== collection.id)].slice(0, 8)
      localStorage.setItem(RECENT_KEY, JSON.stringify(updated))
    } catch {
      // ignore
    }
  }, [collection.id])

  const handleSaveRules = async (filterQuery: Record<string, unknown>) => {
    const res = await fetch(`/api/smart-collections/${collection.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filterQuery, isSystemGenerated: false }),
    })
    if (!res.ok) throw new Error('Update failed')
    toast.success('Rules updated')
    router.refresh()
  }

  const lastUpdated = collection.updatedAt
    ? new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
        Math.round(
          (new Date(collection.updatedAt).getTime() - Date.now()) / 60000,
        ),
        'minutes',
      )
    : null

  return (
    <>
      <div className="flex flex-col gap-2 mb-8">
        {/* Back nav */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-xs text-on-surface/40 hover:text-on-surface transition-colors w-fit"
        >
          <ChevronLeft size={14} /> Collections
        </button>

        {/* Title row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-on-surface">{collection.name}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="font-rubik text-[10px] uppercase tracking-widest text-on-surface/40">
                {collection.assetCount.toLocaleString()} ASSETS
              </span>
              {lastUpdated && (
                <>
                  <span className="text-on-surface/20">·</span>
                  <span className="font-rubik text-[10px] uppercase tracking-widest text-on-surface/30">
                    UPDATED {lastUpdated.toUpperCase()}
                  </span>
                </>
              )}
              {collection.isSystemGenerated && (
                <Badge className="bg-gallery-gold/10 text-gallery-gold border-0 font-rubik text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-sm">
                  AUTO
                </Badge>
              )}
            </div>
            {/* Rule summary */}
            {(() => {
              const summary = summariseFilter(collection.filterQuery)
              const label = summary
                ? `Matches: ${summary}`
                : collection.generatedFrom === 'manual' || !collection.filterQuery
                  ? 'Manually curated'
                  : null
              return label ? (
                <p className="text-xs text-on-surface/40 mt-1">{label}</p>
              ) : null
            })()}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setEditorOpen(true)}
              className={cn(
                'rounded-[16px] gap-2 text-sm font-semibold border-[#d5c4af]/30',
                'hover:border-gallery-gold/30 hover:bg-gallery-gold/[0.03] hover:text-gallery-gold',
                'md:inline-flex hidden',
              )}
            >
              <Settings size={14} /> Edit Rules
            </Button>
            {/* Mobile: full-width edit button */}
            <Button
              variant="outline"
              onClick={() => setEditorOpen(true)}
              className={cn(
                'rounded-[16px] gap-2 text-sm font-semibold w-full border-[#d5c4af]/30',
                'hover:border-gallery-gold/30 hover:bg-gallery-gold/[0.03] hover:text-gallery-gold',
                'md:hidden',
              )}
            >
              <Settings size={14} /> Edit Rules
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full p-2 hover:bg-black/[0.06] dark:bg-white/[0.08] text-on-surface/40 hover:text-on-surface transition-colors" aria-haspopup="menu">
                  <MoreHorizontal size={16} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-[16px]">
                <DropdownMenuItem onClick={() => setEditorOpen(true)} className="gap-2 cursor-pointer">
                  <Settings size={14} /> Edit Rules
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => router.push('/dashboard/library')}
                  className="gap-2 cursor-pointer"
                >
                  <ChevronLeft size={14} /> Back to Collections
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <CollectionRuleEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        collectionId={collection.id}
        collectionName={collection.name}
        onSave={handleSaveRules}
      />
    </>
  )
}
