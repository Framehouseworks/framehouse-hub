'use client'

import React, { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Plus,
  BookImage,
  MoreHorizontal,
  Eye,
  Pencil,
  Copy,
  Trash2,
  ExternalLink,
  Link2,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/utilities/cn'
import { Button } from '@/components/ui/button'
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
import {
  fetchMyPortfoliosAction,
  deletePortfolioAction,
  duplicatePortfolioAction,
} from '@/app/(dashboard)/actions/portfolios'
import type { Portfolio } from '@/payload-types'
import { getMediaPreviewUrl } from './types'

type SortKey = 'updatedAt' | 'createdAt' | 'name' | 'assets'

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

function getAssetCount(portfolio: Portfolio): number {
  if (!portfolio.layoutBlocks) return 0
  return portfolio.layoutBlocks.reduce((sum, block) => {
    if (block.blockType === 'grid') return sum + (block.items?.length ?? 0)
    return sum
  }, 0)
}

function getPortfolioCoverUrls(portfolio: Portfolio): string[] {
  const urls: string[] = []
  for (const block of portfolio.layoutBlocks ?? []) {
    if (block.blockType !== 'grid') continue
    for (const item of block.items ?? []) {
      if (typeof item.media === 'object' && item.media) {
        const url = getMediaPreviewUrl(item.media)
        if (url) urls.push(url)
      }
      if (urls.length >= 3) break
    }
    if (urls.length >= 3) break
  }
  return urls
}

function PortfolioCoverMosaic({ urls }: { urls: string[] }) {
  if (urls.length === 0)
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gallery-surface">
        <BookImage size={32} className="text-on-surface/20" />
      </div>
    )

  if (urls.length === 1)
    return <img src={urls[0]} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />

  return (
    <div className="absolute inset-0 grid grid-cols-2 gap-0.5">
      <img
        src={urls[0]}
        alt=""
        className="w-full h-full object-cover row-span-2"
        loading="lazy"
      />
      <div className="flex flex-col gap-0.5 h-full">
        <img src={urls[1]} alt="" className="flex-1 w-full object-cover" loading="lazy" style={{ minHeight: 0 }} />
        {urls[2] ? (
          <img src={urls[2]} alt="" className="flex-1 w-full object-cover" loading="lazy" style={{ minHeight: 0 }} />
        ) : (
          <div className="flex-1 bg-gallery-surface/50" />
        )}
      </div>
    </div>
  )
}

const VISIBILITY_LABELS: Record<string, { label: string; cls: string }> = {
  private: { label: 'PRIVATE', cls: 'bg-on-surface/8 text-on-surface/50' },
  public: { label: 'PUBLIC', cls: 'bg-gallery-gold/15 text-gallery-gold' },
  shared: { label: 'SHARED', cls: 'bg-secondary/15 text-secondary' },
}

interface PortfolioCardProps {
  portfolio: Portfolio
  isDraft: boolean
  onDelete: (id: number) => void
  onDuplicate: (id: number) => void
}

function PortfolioCard({ portfolio, isDraft, onDelete, onDuplicate }: PortfolioCardProps) {
  const assetCount = getAssetCount(portfolio)
  const coverUrls = getPortfolioCoverUrls(portfolio)
  const vis = VISIBILITY_LABELS[portfolio.visibility ?? 'private']
  const publicUrl = `${process.env.NEXT_PUBLIC_SERVER_URL ?? ''}/p/${portfolio.slug}`

  return (
    <article className="group rounded-[20px] bg-white/60 dark:bg-white/5 shadow-[0px_4px_20px_rgba(26,28,28,0.06)] overflow-hidden flex flex-col transition-shadow duration-300 hover:shadow-[0px_8px_32px_rgba(26,28,28,0.1)]">
      {/* Cover */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gallery-surface w-full">
        <PortfolioCoverMosaic urls={coverUrls} />
        {isDraft && (
          <div className="absolute top-3 left-3 bg-[#ff7f67] text-white font-rubik text-[9px] tracking-[0.2em] px-2 py-0.5 rounded-sm uppercase">
            DRAFT
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col flex-1 p-4 gap-3">
        <div className="space-y-0.5">
          <h2 className="text-sm font-semibold text-primary truncate leading-tight">
            {portfolio.name}
          </h2>
          {portfolio.subheading && (
            <p className="text-[11px] text-on-surface/40 truncate uppercase tracking-wide">
              {typeof portfolio.subheading === 'string'
                ? portfolio.subheading
                : extractSubheadingText(portfolio.subheading)}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className={cn('font-rubik text-[9px] tracking-[0.15em] px-1.5 py-0.5 rounded-sm uppercase', vis.cls)}>
            {vis.label}
          </span>
          <span className="font-rubik text-[9px] text-on-surface/30">
            {assetCount} asset{assetCount !== 1 ? 's' : ''}
            {' · '}
            {formatRelativeTime(portfolio.updatedAt)}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-auto pt-1">
          <Link
            href={`/dashboard/portfolios/${portfolio.id}`}
            className="flex-1"
          >
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-8 text-[11px] rounded-xl gap-1.5 text-on-surface/60 hover:text-primary"
              aria-label={`Edit ${portfolio.name}`}
            >
              <Pencil size={13} />
              Edit
            </Button>
          </Link>

          <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-8 text-[11px] rounded-xl gap-1.5 text-on-surface/60 hover:text-primary"
              aria-label={`Preview ${portfolio.name}`}
            >
              <Eye size={13} />
              Preview
            </Button>
          </a>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-xl text-on-surface/40 hover:text-primary flex-shrink-0"
                aria-label="More options"
              >
                <MoreHorizontal size={15} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-2xl">
              <DropdownMenuItem
                onClick={() => {
                  navigator.clipboard.writeText(publicUrl)
                  toast.success('Link copied')
                }}
                className="gap-2 rounded-xl"
              >
                <Link2 size={14} />
                Copy share link
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="gap-2 rounded-xl">
                <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink size={14} />
                  Open in new tab
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDuplicate(portfolio.id)}
                className="gap-2 rounded-xl"
              >
                <Copy size={14} />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(portfolio.id)}
                className="gap-2 rounded-xl text-[#bb1800] focus:text-[#bb1800]"
              >
                <Trash2 size={14} />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </article>
  )
}

function extractSubheadingText(subheading: unknown): string {
  if (!subheading || typeof subheading !== 'object') return ''
  const root = (subheading as { root?: { children?: Array<{ children?: Array<{ text?: string }> }> } }).root
  if (!root?.children) return ''
  return root.children.flatMap((c) => c.children?.map((t) => t.text ?? '') ?? []).join('').trim()
}

export function PortfolioListPage() {
  const router = useRouter()
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<SortKey>('updatedAt')
  const [deleteTarget, setDeleteTarget] = useState<Portfolio | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const result = await fetchMyPortfoliosAction()
    if (result.success && result.data) setPortfolios(result.data.docs)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const sorted = [...portfolios].sort((a, b) => {
    if (sort === 'name') return a.name.localeCompare(b.name)
    if (sort === 'assets') return getAssetCount(b) - getAssetCount(a)
    if (sort === 'createdAt') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })

  const drafts = sorted.filter((p) => {
    const status = (p as Portfolio & { _status?: string })._status
    return status === 'draft'
  })

  async function handleDuplicate(id: number) {
    const result = await duplicatePortfolioAction(id)
    if (result.success && result.data) {
      toast.success('Portfolio duplicated')
      router.push(`/dashboard/portfolios/${result.data.id}`)
    } else {
      toast.error(result.message)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const result = await deletePortfolioAction(deleteTarget.id)
    setDeleting(false)
    setDeleteTarget(null)
    if (result.success) {
      toast.success('Portfolio deleted')
      setPortfolios((prev) => prev.filter((p) => p.id !== deleteTarget.id))
    } else {
      toast.error(result.message)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <header className="flex flex-col gap-3 flex-shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="inline-block bg-gallery-gold/10 text-gallery-gold font-rubik text-[9px] tracking-[0.25em] px-2 py-0.5 rounded-sm uppercase">
              PUBLISH
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-primary lg:text-4xl">
              Portfolios
            </h1>
            <p className="text-base text-on-surface/40 max-w-xl leading-relaxed">
              Create client-ready galleries with curated assets and granular overrides.
            </p>
          </div>
          <div className="flex-shrink-0 pt-1">
            <Link href="/dashboard/portfolios/new">
              <Button variant="gallery" className="h-10 gap-2 rounded-[24px]">
                <Plus size={16} />
                New Portfolio
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Draft resume banner */}
      {!loading && drafts.length > 0 && (
        <div className="flex items-center justify-between gap-3 bg-gallery-gold/8 border border-gallery-gold/20 rounded-2xl px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-gallery-gold" />
            <p className="text-sm text-on-surface/70">
              You have {drafts.length} unfinished portfolio{drafts.length > 1 ? 's' : ''}.
            </p>
          </div>
          <Link
            href={`/dashboard/portfolios/${drafts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0].id}`}
            className="text-sm font-medium text-gallery-gold hover:underline whitespace-nowrap"
          >
            Resume editing →
          </Link>
        </div>
      )}

      {/* Sort + count bar */}
      {!loading && portfolios.length > 0 && (
        <div className="flex items-center justify-between gap-3">
          <span className="font-rubik text-[9px] tracking-[0.2em] text-on-surface/30 uppercase">
            {portfolios.length} portfolio{portfolios.length !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-1">
            {(['updatedAt', 'createdAt', 'name', 'assets'] as SortKey[]).map((k) => (
              <button
                key={k}
                onClick={() => setSort(k)}
                className={cn(
                  'text-[10px] px-2.5 py-1 rounded-xl transition-colors',
                  sort === k
                    ? 'bg-gallery-gold/15 text-gallery-gold font-semibold'
                    : 'text-on-surface/35 hover:text-on-surface/60',
                )}
              >
                {{
                  updatedAt: 'Updated',
                  createdAt: 'Created',
                  name: 'Name',
                  assets: 'Assets',
                }[k]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 rounded-2xl bg-gallery-surface/50 animate-pulse" />
          ))}
        </div>
      ) : portfolios.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {sorted.map((p) => {
            const status = (p as Portfolio & { _status?: string })._status
            return (
              <PortfolioCard
                key={p.id}
                portfolio={p}
                isDraft={status === 'draft'}
                onDelete={(id) => setDeleteTarget(portfolios.find((x) => x.id === id) ?? null)}
                onDuplicate={handleDuplicate}
              />
            )
          })}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete portfolio?</DialogTitle>
            <DialogDescription>
              &ldquo;{deleteTarget?.name}&rdquo; will be permanently deleted. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-xl bg-[#bb1800] hover:bg-[#9a1400] text-white"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gallery-gold/10 flex items-center justify-center">
        <BookImage size={28} className="text-gallery-gold" />
      </div>
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-primary">Your portfolio canvas is empty</h2>
        <p className="text-sm text-on-surface/40 max-w-xs leading-relaxed">
          Start with a shoot from your Archive and create your first client gallery.
        </p>
      </div>
      <Link href="/dashboard/portfolios/new">
        <Button variant="gallery" className="h-10 gap-2 rounded-[24px]">
          <Plus size={16} />
          Create first portfolio
        </Button>
      </Link>
    </div>
  )
}
