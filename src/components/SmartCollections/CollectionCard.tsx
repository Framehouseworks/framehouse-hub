'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  MoreHorizontal,
  Eye,
  EyeOff,
  Pencil,
  Copy,
  Trash2,
  Settings,
  Image as ImageIcon,
  Layers,
  Filter,
  Bookmark,
  SlidersHorizontal,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/utilities/cn'
import { toast } from 'sonner'

export interface CollectionCardData {
  id: number
  name: string
  isSystemGenerated?: boolean
  isHidden?: boolean
  generatedFrom?: string
  assetCount?: number
  thumbnails?: string[]
  coverAsset?: { url?: string; thumbnailUrl?: string } | null
  sortOrder?: number
  filterQuery?: Record<string, unknown> | null
  hasManualOverrides?: boolean
  updatedAt?: string
}

// ─── Payload field → human label ────────────────────────────────────────────
const PAYLOAD_FIELD_LABELS: Record<string, string> = {
  'manualTags.tag': 'Tag',
  'heuristicTags.tag': 'Auto-tag',
  shootName: 'Shoot',
  mediaType: 'Type',
  'technical.cameraMake': 'Make',
  'technical.cameraModel': 'Camera',
  'technical.lensModel': 'Lens',
  captureDate: 'Date',
  filesize: 'Size',
  width: 'Ratio',
}

function extractClauseLabel(clause: Record<string, unknown>): string | null {
  if (clause.and || clause.or) return null
  const entries = Object.entries(clause)
  if (!entries.length) return null
  const [field, ops] = entries[0]
  if (typeof ops !== 'object' || !ops) return null
  const label = PAYLOAD_FIELD_LABELS[field] ?? (field.split('.').pop() ?? field)
  const val = Object.values(ops as Record<string, unknown>)[0]
  if (typeof val === 'string' || typeof val === 'number') {
    const s = String(val)
    return `${label} = ${s.length > 18 ? s.slice(0, 16) + '…' : s}`
  }
  return label
}

export function summariseFilter(fq: Record<string, unknown> | null | undefined): string | null {
  if (!fq || Object.keys(fq).length === 0) return null
  const clauses =
    (fq.and as unknown[] | undefined) ?? (fq.or as unknown[] | undefined)
  if (clauses) {
    const labels = clauses
      .map((c) => extractClauseLabel(c as Record<string, unknown>))
      .filter(Boolean) as string[]
    if (!labels.length) return null
    if (labels.length > 2) return `${labels.length} rules active`
    return labels.join(' · ')
  }
  return extractClauseLabel(fq)
}

function CollectionTypeIcon({ col }: { col: CollectionCardData }) {
  const hasFilter = col.filterQuery && Object.keys(col.filterQuery).length > 0
  if (!hasFilter)
    return <Bookmark size={11} className="text-on-surface/40 flex-shrink-0 mt-px" aria-label="Manual view" />
  if (col.hasManualOverrides)
    return <SlidersHorizontal size={11} className="text-gallery-gold/70 flex-shrink-0 mt-px" aria-label="Hybrid view" />
  return <Filter size={11} className="text-gallery-gold flex-shrink-0 mt-px" aria-label="Rule-based view" />
}

interface CollectionCardProps {
  collection: CollectionCardData
  onHide?: (id: number, hidden: boolean) => Promise<void>
  onDelete?: (id: number) => Promise<void>
  onDuplicate?: (id: number) => Promise<void>
  onEditRules?: (id: number) => void
  onManageAssets?: (id: number) => void
  /** Multi-select mode */
  selectionMode?: boolean
  selected?: boolean
  onToggleSelect?: (id: number) => void
}

export function CollectionCard({
  collection,
  onHide,
  onDelete,
  onDuplicate,
  onEditRules,
  onManageAssets,
  selectionMode = false,
  selected = false,
  onToggleSelect,
}: CollectionCardProps) {
  const router = useRouter()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const nameRef = useRef<HTMLSpanElement>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isEmpty = (collection.assetCount ?? 0) === 0

  const handleCardClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('[data-menu-trigger]') || target.closest('[role="menu"]')) return
      if (selectionMode) {
        onToggleSelect?.(collection.id)
        return
      }
      if (isEmpty) return
      router.push(`/dashboard/library/collections/${collection.id}`)
    },
    [router, collection.id, isEmpty, selectionMode, onToggleSelect],
  )

  const handleRename = useCallback(() => {
    setIsRenaming(true)
    setTimeout(() => {
      nameRef.current?.focus()
      const range = document.createRange()
      const sel = window.getSelection()
      if (nameRef.current && sel) {
        range.selectNodeContents(nameRef.current)
        sel.removeAllRanges()
        sel.addRange(range)
      }
    }, 0)
  }, [])

  const handleNameBlur = useCallback(async () => {
    if (!isRenaming) return
    setIsRenaming(false)
    const newName = nameRef.current?.textContent?.trim() || collection.name
    if (newName === collection.name) return
    try {
      const res = await fetch(`/api/smart-collections/${collection.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      })
      if (!res.ok) throw new Error('Rename failed')
      router.refresh()
    } catch {
      toast.error('Failed to rename collection')
      if (nameRef.current) nameRef.current.textContent = collection.name
    }
  }, [isRenaming, collection.name, collection.id, router])

  const handleConfirmDelete = async () => {
    setIsDeleting(true)
    try {
      await onDelete?.(collection.id)
      setShowDeleteDialog(false)
      toast.success('Collection deleted')
      router.refresh()
    } catch {
      toast.error('Failed to delete collection')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleTouchStart = useCallback(() => {
    longPressTimer.current = setTimeout(() => {
      document.getElementById(`menu-trigger-${collection.id}`)?.click()
    }, 600)
  }, [collection.id])

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
  }, [])

  const coverSrc =
    collection.coverAsset?.thumbnailUrl ||
    collection.coverAsset?.url ||
    collection.thumbnails?.[0] ||
    null

  const mosaicThumbs = collection.thumbnails?.slice(0, 4) ?? []

  return (
    <>
      <div
        role={isEmpty ? undefined : 'button'}
        tabIndex={isEmpty ? -1 : 0}
        aria-label={`Open ${collection.name} collection`}
        aria-disabled={isEmpty}
        onClick={handleCardClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ')
            handleCardClick(e as unknown as React.MouseEvent)
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={cn(
          'group relative flex flex-col bg-[#f9f9f9] dark:bg-white/[0.02] rounded-[24px] p-2',
          'shadow-[0px_20px_40px_rgba(26,28,28,0.06)]',
          'transition-all duration-300',
          !collection.isSystemGenerated && 'outline outline-1 outline-[#d5c4af]/15',
          collection.isHidden && 'opacity-70',
          selectionMode && selected && 'ring-2 ring-[#d79922] ring-offset-2',
          isEmpty && !selectionMode
            ? 'opacity-60 pointer-events-none'
            : 'hover:-translate-y-0.5 hover:shadow-[0px_24px_48px_rgba(26,28,28,0.10)] cursor-pointer',
        )}
        aria-busy={collection.assetCount === undefined}
      >
        {/* Cover area — inset by card padding (p-2), no overflow clipping needed */}
        <div className="relative aspect-[4/3] w-full rounded-[16px] overflow-hidden bg-black/[0.06] dark:bg-white/[0.08] flex-shrink-0">
          {coverSrc ? (
            <Image
              src={coverSrc}
              alt={collection.name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 33vw"
            />
          ) : mosaicThumbs.length >= 4 ? (
            <div className="grid grid-cols-2 gap-px w-full h-full">
              {mosaicThumbs.map((src, i) => (
                <div key={i} className="relative overflow-hidden">
                  <Image src={src} alt="" fill className="object-cover" sizes="20vw" />
                </div>
              ))}
            </div>
          ) : mosaicThumbs.length > 0 ? (
            <Image
              src={mosaicThumbs[0]}
              alt={collection.name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 33vw"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Layers className="text-[#d5c4af]" size={32} />
            </div>
          )}
          {/* Tonal gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20 pointer-events-none" />
          {/* Selection circle — always rendered; acts as entry point into selection mode */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              onToggleSelect?.(collection.id)
            }}
            className={cn(
              'absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center',
              'transition-all duration-150 z-10',
              'focus:outline-none focus-visible:shadow-[0_0_0_2px_rgba(215,153,34,0.6)]',
              selectionMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
              selected
                ? 'bg-[#d79922] shadow-[0px_2px_8px_rgba(215,153,34,0.5)]'
                : 'bg-white/80 dark:bg-black/60 backdrop-blur-[4px]',
            )}
            aria-label={selected ? `Deselect ${collection.name}` : `Select ${collection.name}`}
            aria-pressed={selected}
          >
            {selected && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>

        {/* Card content */}
        <div className="px-2 pt-3 pb-2 flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-start gap-1.5 min-w-0">
              <CollectionTypeIcon col={collection} />
              <span
                ref={nameRef}
                contentEditable={isRenaming}
                suppressContentEditableWarning
                onBlur={handleNameBlur}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    nameRef.current?.blur()
                  }
                  if (e.key === 'Escape') {
                    setIsRenaming(false)
                    if (nameRef.current) nameRef.current.textContent = collection.name
                  }
                }}
                className={cn(
                  'text-sm font-semibold text-on-surface truncate transition-colors duration-200 min-w-0',
                  !isEmpty && 'group-hover:text-gallery-gold',
                  isRenaming && 'outline-none border-b border-gallery-gold/50',
                )}
              >
                {collection.name}
              </span>
            </div>

            {/* Context menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild data-menu-trigger>
                <button
                  id={`menu-trigger-${collection.id}`}
                  aria-haspopup="menu"
                  onClick={(e) => e.stopPropagation()}
                  className="rounded-full p-1.5 hover:bg-black/[0.06] dark:bg-white/[0.08] text-on-surface/40 hover:text-on-surface transition-colors flex-shrink-0 pointer-events-auto"
                >
                  <MoreHorizontal size={14} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="rounded-[16px] min-w-[168px]"
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenuItem
                  onClick={() => onEditRules?.(collection.id)}
                  className="gap-2 cursor-pointer"
                >
                  <Settings size={14} /> Edit Rules
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onManageAssets?.(collection.id)}
                  className="gap-2 cursor-pointer"
                >
                  <SlidersHorizontal size={14} /> Include / Exclude Assets
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 cursor-pointer">
                  <ImageIcon size={14} /> Set Cover Image
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleRename} className="gap-2 cursor-pointer">
                  <Pencil size={14} /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDuplicate?.(collection.id)}
                  className="gap-2 cursor-pointer"
                >
                  <Copy size={14} /> Duplicate View
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onHide?.(collection.id, !collection.isHidden)}
                  className="gap-2 cursor-pointer"
                >
                  {collection.isHidden ? (
                    <>
                      <Eye size={14} /> Show in Library
                    </>
                  ) : (
                    <>
                      <EyeOff size={14} /> Hide from Library
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="gap-2 cursor-pointer text-red-500 focus:text-red-500"
                >
                  <Trash2 size={14} /> Delete View
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-2 flex-wrap">
            {collection.assetCount === undefined ? (
              <span
                className="h-3 w-16 bg-black/[0.06] dark:bg-white/[0.08] animate-pulse rounded"
                aria-busy="true"
              />
            ) : (
              <span className="font-rubik text-[10px] uppercase tracking-widest text-on-surface/40">
                {collection.assetCount.toLocaleString()} ASSETS
              </span>
            )}
            {collection.isSystemGenerated && (
              <Badge className="bg-gallery-gold/10 text-gallery-gold border-0 font-rubik text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-sm">
                AUTO
              </Badge>
            )}
            {collection.isHidden && (
              <Badge className="bg-black/[0.06] dark:bg-white/[0.08] text-on-surface/40 border-0 font-rubik text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-sm">
                HIDDEN
              </Badge>
            )}
          </div>
          {/* Rule summary */}
          {(() => {
            const summary = summariseFilter(collection.filterQuery)
            const label = summary ?? (collection.generatedFrom === 'manual' ? 'Manually curated' : null)
            return label ? (
              <p className="text-[10px] text-on-surface/35 truncate leading-tight" aria-label={`Rules: ${label}`}>
                {label}
              </p>
            ) : null
          })()}
        </div>
      </div>

      {/* Delete confirmation */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="rounded-[24px] max-w-md">
          <DialogHeader>
            <DialogTitle>Delete View</DialogTitle>
            <DialogDescription>
              This removes the view only.{' '}
              <strong>Your assets are never deleted.</strong>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowDeleteDialog(false)}
              className="rounded-[16px]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-[#bb1800] hover:bg-[#9a1400] text-white rounded-[16px]"
            >
              {isDeleting ? 'Deleting…' : 'Delete Collection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
