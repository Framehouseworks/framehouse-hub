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
        <div className="relative aspect-[4/3] w-full rounded-[16px] overflow-hidden bg-[#eeeeee] flex-shrink-0">
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
          {/* Selection checkbox — visible in selectionMode or on hover */}
          {(selectionMode || true) && (
            <div
              className={cn(
                'absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-150',
                'pointer-events-none',
                selectionMode || 'opacity-0 group-hover:opacity-100',
                selected
                  ? 'bg-[#d79922] shadow-[0px_2px_8px_rgba(215,153,34,0.5)]'
                  : 'bg-white/80 backdrop-blur-[4px]',
              )}
              aria-hidden="true"
            >
              {selected && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          )}
        </div>

        {/* Card content */}
        <div className="px-2 pt-3 pb-2 flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
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
                'text-sm font-semibold text-[#1a1c1c] truncate transition-colors duration-200 min-w-0',
                !isEmpty && 'group-hover:text-gallery-gold',
                isRenaming && 'outline-none border-b border-gallery-gold/50',
              )}
            >
              {collection.name}
            </span>

            {/* Context menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild data-menu-trigger>
                <button
                  id={`menu-trigger-${collection.id}`}
                  aria-haspopup="menu"
                  onClick={(e) => e.stopPropagation()}
                  className="rounded-full p-1.5 hover:bg-[#eeeeee] text-[#1a1c1c]/40 hover:text-[#1a1c1c] transition-colors flex-shrink-0 pointer-events-auto"
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
                  <Copy size={14} /> Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onHide?.(collection.id, !collection.isHidden)}
                  className="gap-2 cursor-pointer"
                >
                  {collection.isHidden ? (
                    <>
                      <Eye size={14} /> Show
                    </>
                  ) : (
                    <>
                      <EyeOff size={14} /> Hide
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="gap-2 cursor-pointer text-red-500 focus:text-red-500"
                >
                  <Trash2 size={14} /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-2 flex-wrap">
            {collection.assetCount === undefined ? (
              <span
                className="h-3 w-16 bg-[#eeeeee] animate-pulse rounded"
                aria-busy="true"
              />
            ) : (
              <span className="font-rubik text-[10px] uppercase tracking-widest text-[#1a1c1c]/40">
                {collection.assetCount.toLocaleString()} ASSETS
              </span>
            )}
            {collection.isSystemGenerated && (
              <Badge className="bg-gallery-gold/10 text-gallery-gold border-0 font-rubik text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-sm">
                AUTO
              </Badge>
            )}
            {collection.isHidden && (
              <Badge className="bg-[#eeeeee] text-[#1a1c1c]/40 border-0 font-rubik text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-sm">
                HIDDEN
              </Badge>
            )}
            {collection.generatedFrom && collection.generatedFrom !== 'manual' && (
              <Badge className="bg-[#eeeeee] text-[#1a1c1c]/30 border-0 font-rubik text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-sm">
                {collection.generatedFrom.replace('_', ' ')}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Delete confirmation */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="rounded-[24px] max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Collection</DialogTitle>
            <DialogDescription>
              This removes the collection only.{' '}
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
