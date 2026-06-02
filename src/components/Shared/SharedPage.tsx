'use client'

import React, { useState, useCallback, useMemo, useId, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Share2, BookImage, Link2, ExternalLink, Eye, Lock, Globe, Check } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/utilities/cn'
import { Button } from '@/components/ui/button'
import { getMediaPreviewUrl } from '@/components/Portfolios/types'
import type { Portfolio } from '@/payload-types'

// ── Helpers ───────────────────────────────────────────────────────────────────
// NOTE: These are intentionally local. A shared utility extraction (FRH-XXX) should
// consolidate with PortfolioListPage equivalents once the Shared section stabilises.

function formatDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  // Locale-pinned to prevent SSR/client hydration mismatch (#13)
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getAssetCount(portfolio: Portfolio): number {
  return (portfolio.layoutBlocks ?? []).reduce((sum, block) => {
    if (block.blockType === 'grid') return sum + (block.items?.length ?? 0)
    return sum
  }, 0)
}

function getCoverUrls(portfolio: Portfolio): string[] {
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

// Use the same env var as PortfolioListPage for URL construction (#1 — avoids window.location SSR issue)
function buildPublicUrl(slug: string | null | undefined): string {
  return `${process.env.NEXT_PUBLIC_SERVER_URL ?? ''}/p/${slug ?? ''}`
}

// ── Cover mosaic ──────────────────────────────────────────────────────────────

function CoverMosaic({ urls }: { urls: string[] }) {
  if (urls.length === 0)
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gallery-surface">
        <BookImage size={28} className="text-on-surface/20" aria-hidden="true" />
      </div>
    )
  if (urls.length === 1)
    return <img src={urls[0]} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
  return (
    <div className="absolute inset-0 grid grid-cols-2 gap-0.5" aria-hidden="true">
      <img src={urls[0]} alt="" className="w-full h-full object-cover row-span-2" loading="lazy" />
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

// ── Visibility config — with null-safe fallback (#4) ─────────────────────────

const VIS_META: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  shared: { label: 'SHARED', cls: 'bg-secondary/15 text-secondary', icon: Link2 },
  public: { label: 'PUBLIC', cls: 'bg-gallery-gold/15 text-gallery-gold', icon: Globe },
}

const FALLBACK_VIS = { label: 'SHARED', cls: 'bg-secondary/15 text-secondary', icon: Link2 }

// ── Portfolio card ────────────────────────────────────────────────────────────

function SharedPortfolioCard({ portfolio }: { portfolio: Portfolio }) {
  const [copied, setCopied] = useState(false)
  const srRef = useRef<HTMLSpanElement>(null)

  const assetCount = getAssetCount(portfolio)
  const coverUrls = getCoverUrls(portfolio)
  // Null-safe visibility lookup (#4)
  const vis = VIS_META[portfolio.visibility ?? ''] ?? FALLBACK_VIS
  const VisIcon = vis.icon

  // Build URL server-safely (#1, #20)
  const publicUrl = buildPublicUrl(portfolio.slug)

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      toast.success('Link copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy link')
    }
  }, [publicUrl])

  // Announce copy state to screen readers via aria-live (#8)
  useEffect(() => {
    if (srRef.current) srRef.current.textContent = copied ? 'Link copied.' : ''
  }, [copied])

  // Password field: only render the indicator if the field is a non-empty string
  // Payload may return "" for cleared passwords — guard against it (#16)
  const isPasswordProtected =
    portfolio.visibility === 'shared' &&
    typeof portfolio.password === 'string' &&
    portfolio.password.length > 0

  return (
    // Remove aria-label — <h2> inside provides the accessible name (#11)
    <article className="group rounded-[20px] bg-white/60 dark:bg-white/5 shadow-[0px_4px_20px_rgba(26,28,28,0.06)] overflow-hidden flex flex-col transition-shadow duration-300 hover:shadow-[0px_8px_32px_rgba(26,28,28,0.1)]">
      {/* Screen-reader live region for copy feedback (#8) */}
      <span ref={srRef} className="sr-only" aria-live="polite" aria-atomic="true" />

      {/* Cover */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gallery-surface w-full">
        <CoverMosaic urls={coverUrls} />
        <div className="absolute top-3 left-3">
          <span className={cn('flex items-center gap-1 font-rubik text-[9px] tracking-[0.15em] px-1.5 py-0.5 rounded-sm uppercase', vis.cls)}>
            <VisIcon size={9} aria-hidden="true" />
            {vis.label}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-col flex-1 p-4 gap-3">
        <div className="space-y-0.5">
          {/* h2 provides the accessible name for the article — no aria-label needed on article (#11) */}
          <h2 className="text-sm font-semibold text-primary truncate leading-tight">{portfolio.name}</h2>
          <p className="font-rubik text-[9px] text-on-surface/30">
            {assetCount} asset{assetCount !== 1 ? 's' : ''} · {formatDate(portfolio.updatedAt)}
          </p>
        </div>

        {isPasswordProtected && (
          <div className="flex items-center gap-1.5 text-on-surface/40" aria-label="Password protected">
            <Lock size={11} aria-hidden="true" />
            <span className="text-[10px]">Password protected</span>
          </div>
        )}

        {/* Actions — min 44px touch targets (#2), focus rings (#3), touch-action (#5) */}
        <div className="flex items-center gap-2 mt-auto pt-1">
          <button
            onClick={copyLink}
            aria-label={copied ? 'Link copied' : 'Copy share link'}
            aria-pressed={copied}
            style={{ touchAction: 'manipulation' }}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 min-h-[44px] rounded-[16px] text-xs font-medium',
              'transition-all duration-200 active:scale-95',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gallery-gold/50',
              copied
                ? 'bg-gallery-gold/15 text-gallery-gold'
                : 'bg-gallery-surface hover:bg-gallery-surface/80 text-on-surface/60 hover:text-primary',
            )}
          >
            {copied ? <Check size={13} aria-hidden="true" /> : <Link2 size={13} aria-hidden="true" />}
            <span aria-hidden={copied}>{copied ? 'Copied' : 'Copy link'}</span>
          </button>

          <Link
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Preview "${portfolio.name}" in new tab`}
            style={{ touchAction: 'manipulation' }}
            className={cn(
              'flex items-center justify-center min-w-[44px] min-h-[44px] rounded-[16px] shrink-0',
              'bg-gallery-surface hover:bg-gallery-surface/80 text-on-surface/40 hover:text-primary',
              'transition-all duration-200 active:scale-95',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gallery-gold/50',
            )}
          >
            <Eye size={15} aria-hidden="true" />
          </Link>

          <Link
            href={`/dashboard/portfolios/${portfolio.id}`}
            aria-label={`Edit "${portfolio.name}"`}
            style={{ touchAction: 'manipulation' }}
            className={cn(
              'flex items-center justify-center min-w-[44px] min-h-[44px] rounded-[16px] shrink-0',
              'bg-gallery-surface hover:bg-gallery-surface/80 text-on-surface/40 hover:text-primary',
              'transition-all duration-200 active:scale-95',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gallery-gold/50',
            )}
          >
            <ExternalLink size={15} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  )
}

// ── Filter tabs ───────────────────────────────────────────────────────────────

type Filter = 'all' | 'shared' | 'public'

function FilterTabs({
  active,
  counts,
  panelId,
  onChange,
}: {
  active: Filter
  counts: { all: number; shared: number; public: number }
  panelId: string
  onChange: (f: Filter) => void
}) {
  const tabs: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'shared', label: 'Shared' },
    { key: 'public', label: 'Public' },
  ]

  return (
    <div
      role="tablist"
      aria-label="Filter shared portfolios"
      className="flex items-center gap-1 bg-gallery-surface rounded-[20px] p-1 w-fit"
    >
      {tabs.map(({ key, label }) => (
        <button
          key={key}
          role="tab"
          id={`tab-${key}`}
          aria-selected={active === key}
          // Wire tabs to the controlled panel (#7)
          aria-controls={panelId}
          onClick={() => onChange(key)}
          style={{ touchAction: 'manipulation' }}
          className={cn(
            'flex items-center gap-1.5 px-4 min-h-[36px] rounded-[16px] text-xs font-medium',
            'transition-all duration-200 active:scale-95',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gallery-gold/50',
            active === key
              ? 'bg-white dark:bg-white/10 text-primary shadow-[0px_2px_8px_rgba(26,28,28,0.08)]'
              : 'text-on-surface/50 hover:text-on-surface/80',
          )}
        >
          {label}
          <span
            className={cn('font-rubik text-[9px]', active === key ? 'text-gallery-gold' : 'text-on-surface/30')}
            aria-label={`${counts[key]} portfolios`}
          >
            {counts[key]}
          </span>
        </button>
      ))}
    </div>
  )
}

// ── Empty states ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-16 sm:py-24 text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center" aria-hidden="true">
        <Share2 size={28} className="text-secondary/60" />
      </div>
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-primary">No shared work yet</h2>
        <p className="text-sm text-on-surface/40 max-w-xs leading-relaxed">
          Set a portfolio&apos;s visibility to <strong className="text-on-surface/60">Shared</strong> or{' '}
          <strong className="text-on-surface/60">Public</strong> to surface it here with a shareable link.
        </p>
      </div>
      <Link href="/dashboard/portfolios">
        <Button variant="gallery" className="h-10 gap-2 rounded-[24px]">
          <BookImage size={16} aria-hidden="true" />
          Go to Portfolios
        </Button>
      </Link>
    </div>
  )
}

function FilterEmptyState({ filter }: { filter: Filter }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12 text-center px-4">
      <p className="text-sm text-on-surface/40">
        No <span className="font-medium text-on-surface/60">{filter}</span> portfolios found.
      </p>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface SharedPageProps {
  initialPortfolios: Portfolio[]
}

export function SharedPage({ initialPortfolios }: SharedPageProps) {
  const router = useRouter()
  const [filter, setFilter] = useState<Filter>('all')
  const panelId = useId()

  // Refresh data when the tab becomes visible again (#15 — stale after publish in another tab)
  useEffect(() => {
    const onFocus = () => router.refresh()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [router])

  // Memoise derived counts to avoid recalculation on every render (#14)
  const { sharedItems, publicItems, counts } = useMemo(() => {
    const s = initialPortfolios.filter((p) => p.visibility === 'shared')
    const p = initialPortfolios.filter((p) => p.visibility === 'public')
    return {
      sharedItems: s,
      publicItems: p,
      counts: { all: initialPortfolios.length, shared: s.length, public: p.length },
    }
  }, [initialPortfolios])

  const filtered =
    filter === 'all' ? initialPortfolios : filter === 'shared' ? sharedItems : publicItems

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-primary">Shared Work</h1>
          <p className="text-sm text-on-surface/40 mt-0.5">
            Portfolios visible to clients or the public.
          </p>
        </div>
        {initialPortfolios.length > 0 && (
          <Link href="/dashboard/portfolios">
            {/* Use ghost instead of outline — DESIGN.md "No-Line" rule prohibits 1px borders (#18) */}
            <Button variant="ghost" size="sm" className="h-9 gap-2 rounded-[16px] text-xs shrink-0">
              <BookImage size={14} aria-hidden="true" />
              Manage portfolios
            </Button>
          </Link>
        )}
      </div>

      {initialPortfolios.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Filter tabs */}
          <FilterTabs active={filter} counts={counts} panelId={panelId} onChange={setFilter} />

          {/* Portfolio grid — consistent gap-6 matching dashboard convention (#17) */}
          <div
            id={panelId}
            role="tabpanel"
            aria-labelledby={`tab-${filter}`}
          >
            {filtered.length === 0 ? (
              <FilterEmptyState filter={filter} />
            ) : (
              // Semantic list — <ul>/<li> avoids div[role="list"] overhead (#6)
              <ul
                aria-label="Shared portfolios"
                className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 list-none p-0 m-0"
              >
                {filtered.map((portfolio) => (
                  <li key={portfolio.id}>
                    <SharedPortfolioCard portfolio={portfolio} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}
