'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MapPin, Images, MoreHorizontal, Pencil, Trash2, Settings } from 'lucide-react'
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
import { Button } from '@/components/ui/button'
import { cn } from '@/utilities/cn'
import { toast } from 'sonner'
import { SessionEditPanel, type SessionEditData } from './SessionEditPanel'

export interface SessionCardData {
  id: number
  name: string
  shootDate?: string | null
  description?: string | null
  location?: { address?: string | null } | null
  assetCount: number
  thumbnails: string[]
  defaultTags?: string[]
  locationFull?: { address?: string | null; latitude?: number | null; longitude?: number | null } | null
}

function parseDate(iso: string) {
  const d = new Date(iso)
  return {
    day: d.toLocaleDateString('en-GB', { day: 'numeric' }),
    month: d.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase(),
    year: d.getFullYear(),
  }
}

export function SessionCard({ session }: { session: SessionCardData }) {
  const router = useRouter()
  const date = session.shootDate ? parseDate(session.shootDate) : null
  const [t1, t2, t3, t4] = session.thumbnails
  const hasQuad = session.thumbnails.length >= 4

  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(session.name)
  const renameInputRef = useRef<HTMLInputElement>(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)

  useEffect(() => {
    if (isRenaming) {
      renameInputRef.current?.focus()
      renameInputRef.current?.select()
    }
  }, [isRenaming])

  const handleRenameCommit = async () => {
    const trimmed = renameValue.trim()
    setIsRenaming(false)
    if (!trimmed || trimmed === session.name) return
    try {
      const res = await fetch(`/api/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: trimmed }),
      })
      if (!res.ok) throw new Error()
      router.refresh()
    } catch {
      toast.error('Rename failed — try again')
      setRenameValue(session.name)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/sessions/${session.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) throw new Error()
      toast.success(`${session.name} deleted · Assets kept`)
      router.refresh()
    } catch {
      toast.error('Delete failed — try again')
    } finally {
      setIsDeleting(false)
      setIsDeleteOpen(false)
    }
  }

  const editData: SessionEditData = {
    id: session.id,
    name: session.name,
    shootDate: session.shootDate,
    description: session.description,
    location: session.locationFull ?? session.location,
    defaultTags: session.defaultTags,
  }

  return (
    <>
      <div className="group relative flex gap-0 rounded-[20px] overflow-hidden bg-white dark:bg-white/[0.03] hover:bg-white dark:hover:bg-white/[0.05] shadow-[0_2px_16px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.10)] transition-all duration-300">
        {/* Clickable area */}
        <Link
          href={`/dashboard/library/sessions/${session.id}`}
          className="flex flex-1 min-w-0 gap-0"
          tabIndex={0}
          aria-label={`Open session: ${session.name}`}
        >
          {/* Date column */}
          <div className="flex-shrink-0 w-[56px] bg-[#445aa5] flex flex-col items-center justify-center py-4 gap-0.5">
            {date ? (
              <>
                <span className="font-rubik text-[9px] font-bold text-white/60 uppercase tracking-widest">
                  {date.month}
                </span>
                <span className="font-inter text-2xl font-bold text-white leading-none">
                  {date.day}
                </span>
                <span className="font-rubik text-[9px] text-white/40 tabular-nums mt-0.5">
                  {date.year}
                </span>
              </>
            ) : (
              <span className="font-rubik text-[9px] text-white/40 uppercase tracking-widest">
                —
              </span>
            )}
          </div>

          {/* Content */}
          <div className="flex flex-1 min-w-0 gap-3 p-3 sm:p-4 items-center">
            {/* Thumbnail strip */}
            <div className="flex-shrink-0 w-[72px] h-[72px] sm:w-[84px] sm:h-[84px] rounded-[14px] overflow-hidden bg-black/[0.04] dark:bg-white/[0.04]">
              {hasQuad ? (
                <div className="grid grid-cols-2 grid-rows-2 h-full gap-px">
                  {[t1, t2, t3, t4].map((src, i) => (
                    <div key={i} className="relative overflow-hidden bg-black/[0.06]">
                      {src && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
                      )}
                    </div>
                  ))}
                </div>
              ) : session.thumbnails.length > 0 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={t1}
                  alt=""
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Images className="text-on-surface/10" size={22} />
                </div>
              )}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0 space-y-1">
              {isRenaming ? (
                <div className="w-full rounded-[8px] bg-black/[0.04] dark:bg-white/[0.05] focus-within:shadow-[0_0_0_2px_rgba(68,90,165,0.35)] transition-shadow">
                  <input
                    ref={renameInputRef}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={handleRenameCommit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameCommit()
                      if (e.key === 'Escape') {
                        setIsRenaming(false)
                        setRenameValue(session.name)
                      }
                      e.stopPropagation()
                    }}
                    onClick={(e) => e.preventDefault()}
                    className="w-full font-inter text-sm font-semibold text-primary bg-transparent rounded-[8px] px-2 py-0.5 outline-none focus:outline-none leading-snug"
                    aria-label="Rename session"
                  />
                </div>
              ) : (
                <h3
                  className="font-inter text-sm font-semibold text-primary leading-snug line-clamp-1 group-hover:text-[#445aa5] transition-colors"
                  onDoubleClick={(e) => {
                    e.preventDefault()
                    setIsRenaming(true)
                  }}
                >
                  {session.name}
                </h3>
              )}

              {session.location?.address && (
                <p className="inline-flex items-center gap-1 font-rubik text-[10px] text-on-surface/40 truncate max-w-full">
                  <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
                  {session.location.address}
                </p>
              )}

              {session.description && (
                <p className="font-inter text-[11px] text-on-surface/40 line-clamp-1 leading-relaxed">
                  {session.description}
                </p>
              )}
            </div>

            {/* Asset count */}
            <div className="flex-shrink-0 text-right pr-2">
              <span className="font-rubik text-lg font-bold text-on-surface/70 tabular-nums leading-none">
                {session.assetCount.toLocaleString()}
              </span>
              <p className="font-rubik text-[8px] text-on-surface/30 uppercase tracking-wider">
                assets
              </p>
            </div>
          </div>
        </Link>

        {/* ⋯ menu — overlays right edge */}
        <div
          className={cn(
            'absolute right-3 top-1/2 -translate-y-1/2 transition-opacity duration-150',
            'opacity-0 group-hover:opacity-100 focus-within:opacity-100',
          )}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="w-8 h-8 rounded-[10px] bg-white/90 dark:bg-[#1a1c1c]/80 backdrop-blur-sm flex items-center justify-center text-on-surface/40 hover:text-primary shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#445aa5]/40"
                aria-label={`More options for ${session.name}`}
                onClick={(e) => e.preventDefault()}
              >
                <MoreHorizontal size={15} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-[16px] shadow-[0_12px_32px_rgba(0,0,0,0.12)] border-none w-44 p-1.5">
              <DropdownMenuItem
                onSelect={() => setIsEditOpen(true)}
                className="rounded-[10px] gap-2 text-sm cursor-pointer focus:bg-black/[0.04] dark:focus:bg-white/[0.05]"
              >
                <Settings size={14} className="text-on-surface/40" />
                Edit session
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  setRenameValue(session.name)
                  setIsRenaming(true)
                }}
                className="rounded-[10px] gap-2 text-sm cursor-pointer focus:bg-black/[0.04] dark:focus:bg-white/[0.05]"
              >
                <Pencil size={14} className="text-on-surface/40" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1 bg-black/[0.05] dark:bg-white/[0.06]" />
              <DropdownMenuItem
                onSelect={() => setIsDeleteOpen(true)}
                className="rounded-[10px] gap-2 text-sm cursor-pointer text-[#bb1800] focus:bg-[#bb1800]/[0.06] focus:text-[#bb1800]"
              >
                <Trash2 size={14} />
                Delete session
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Delete confirmation */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="rounded-[24px] border-none shadow-[0_40px_80px_-20px_rgba(0,0,0,0.2)] sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="font-inter text-base font-semibold">
              Delete &ldquo;{session.name}&rdquo;?
            </DialogTitle>
            <DialogDescription className="font-inter text-sm text-on-surface/50 leading-relaxed mt-2">
              This session will be deleted. Your assets will{' '}
              <strong className="text-primary">not</strong> be deleted — they remain in your
              library and any collections they belong to.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 mt-2">
            <Button
              variant="ghost"
              onClick={() => setIsDeleteOpen(false)}
              className="rounded-[14px] flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={isDeleting}
              className="rounded-[14px] flex-1 bg-[#bb1800] hover:bg-[#9a1400] text-white"
            >
              {isDeleting ? 'Deleting…' : 'Delete Session'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit panel */}
      <SessionEditPanel
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        session={editData}
      />
    </>
  )
}
