'use client'

import { cn } from '@/utilities/cn'
import { forceUnpublishPortfolioAction, generatePreviewTokenAction } from '@/app/(dashboard)/actions/portfolios'
import { ChevronUp, Copy, ExternalLink, Pencil, Shield, Unlock } from 'lucide-react'
import React, { useState } from 'react'
import { toast } from 'sonner'

interface AdminSupportOverlayProps {
  portfolioId: number
  portfolioName: string
  portfolioSlug: string
  ownerEmail: string
  status: string
  visibility: string
  updatedAt: string
  pendingReviews?: number
  reviewSettings?: {
    allowSelection: boolean
    allowComments: boolean
    allowDownload: boolean
  }
}

/**
 * Admin-only floating support panel. Renders only when the viewer is an admin.
 * Provides quick access to Payload admin, dashboard editor, token regen, and
 * force-unpublish — all without leaving the portfolio viewer.
 */
export function AdminSupportOverlay({
  portfolioId,
  portfolioName,
  portfolioSlug,
  ownerEmail,
  status,
  visibility,
  updatedAt,
  pendingReviews = 0,
  reviewSettings,
}: AdminSupportOverlayProps) {
  const [open, setOpen] = useState(false)
  const [unpublishing, setUnpublishing] = useState(false)
  const [confirmUnpublish, setConfirmUnpublish] = useState(false)

  const formattedDate = new Date(updatedAt).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  async function handleCopyId() {
    await navigator.clipboard.writeText(String(portfolioId))
    toast.success(`Copied ID #${portfolioId}`)
  }

  async function handleRegenToken() {
    // 48-hour review token for admin use
    const result = await generatePreviewTokenAction(portfolioId, 48 * 60 * 60 * 1000)
    if (!result.success || !result.data?.token) {
      toast.error('Failed to generate token')
      return
    }
    const url = `${window.location.origin}/p/${portfolioSlug}?preview_token=${result.data.token}`
    await navigator.clipboard.writeText(url)
    toast.success('48h review link copied to clipboard')
  }

  async function handleForceUnpublish() {
    if (!confirmUnpublish) {
      setConfirmUnpublish(true)
      return
    }
    setUnpublishing(true)
    const result = await forceUnpublishPortfolioAction(portfolioId)
    setUnpublishing(false)
    setConfirmUnpublish(false)
    if (result.success) {
      toast.success('Portfolio unpublished — page will reload')
      setTimeout(() => window.location.reload(), 1200)
    } else {
      toast.error(result.message || 'Failed to unpublish')
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-[150] flex flex-col items-end gap-2">
      {/* Expanded panel */}
      {open && (
        <div
          role="complementary"
          aria-label="Admin support panel"
          className="flex flex-col gap-1 rounded-2xl overflow-hidden w-64 shadow-2xl"
          style={{ background: 'rgba(20,20,20,0.97)', backdropFilter: 'blur(20px)' }}
        >
          {/* Header */}
          <div className="px-4 pt-4 pb-3 border-b border-white/5">
            <div className="flex items-center gap-2 mb-1">
              <Shield size={12} className="text-[#d79922]" />
              <span
                className="text-[9px] uppercase tracking-[0.3em] text-[#d79922]"
                style={{ fontFamily: "'Rubik Mono One', monospace" }}
              >
                Admin Panel
              </span>
            </div>
            <p className="text-white text-sm font-medium truncate" title={portfolioName}>
              {portfolioName}
            </p>
            <p className="text-white/40 text-[10px] mt-0.5 truncate">{ownerEmail}</p>
          </div>

          {/* Metadata */}
          <div className="px-4 py-2 border-b border-white/5 flex flex-col gap-1">
            <MetaRow label="Status" value={status} highlight={status === 'published'} />
            <MetaRow label="Visibility" value={visibility} />
            <MetaRow label="ID" value={`#${portfolioId}`} />
            <MetaRow label="Updated" value={formattedDate} />
          </div>

          {/* Client Reviews */}
          {reviewSettings && (reviewSettings.allowSelection || reviewSettings.allowComments || reviewSettings.allowDownload) && (
            <div className="px-4 py-2 border-b border-white/5 flex flex-col gap-1">
              <span className="text-[9px] uppercase tracking-[0.3em] text-[#d79922] mb-1" style={{ fontFamily: "'Rubik Mono One', monospace" }}>Client Reviews</span>
              <MetaRow label="Pending" value={String(pendingReviews)} highlight={pendingReviews > 0} />
              <MetaRow label="Selection" value={reviewSettings.allowSelection ? 'On' : 'Off'} />
              <MetaRow label="Comments" value={reviewSettings.allowComments ? 'On' : 'Off'} />
              <MetaRow label="Download" value={reviewSettings.allowDownload ? 'On' : 'Off'} />
            </div>
          )}

          {/* Actions */}
          <div className="px-3 py-3 flex flex-col gap-1">
            <ActionBtn
              href={`/admin/collections/portfolios/${portfolioId}`}
              label="Open in Payload Admin"
              icon={<ExternalLink size={13} />}
              external
            />
            <ActionBtn
              href={`/dashboard/portfolios/${portfolioId}`}
              label="Edit in Dashboard"
              icon={<Pencil size={13} />}
            />
            <ActionBtn
              onClick={handleCopyId}
              label="Copy Portfolio ID"
              icon={<Copy size={13} />}
            />
            <ActionBtn
              onClick={handleRegenToken}
              label="Copy 48h Review Link"
              icon={<Unlock size={13} />}
            />
            {/* Force unpublish — two-step confirm */}
            <button
              type="button"
              onClick={handleForceUnpublish}
              disabled={unpublishing}
              className={cn(
                'flex items-center gap-2 w-full px-3 py-2 rounded-xl text-[11px] transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40',
                confirmUnpublish
                  ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/5',
                unpublishing && 'opacity-50 pointer-events-none',
              )}
            >
              <span className="text-[10px]">⚠</span>
              {unpublishing
                ? 'Unpublishing…'
                : confirmUnpublish
                  ? 'Confirm — click again to unpublish'
                  : 'Force Unpublish'}
            </button>
          </div>
        </div>
      )}

      {/* Toggle badge */}
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setConfirmUnpublish(false) }}
        className="flex items-center gap-2 px-4 py-2.5 rounded-2xl shadow-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d79922]/60"
        style={{ background: 'linear-gradient(135deg, #7f5700, #d79922)' }}
        aria-label={open ? 'Close admin panel' : 'Open admin panel'}
        aria-expanded={open}
      >
        <Shield size={14} className="text-white" />
        <span className="text-white text-[11px] font-medium tracking-wide">Admin</span>
        <ChevronUp
          size={13}
          className={cn('text-white/70 transition-transform duration-200', open ? 'rotate-180' : '')}
        />
      </button>
    </div>
  )
}

function MetaRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center gap-2">
      <span className="text-white/30 text-[10px] uppercase tracking-wide">{label}</span>
      <span
        className={cn(
          'text-[10px] font-medium uppercase tracking-wide',
          highlight ? 'text-emerald-400' : 'text-white/60',
        )}
        style={{ fontFamily: "'Rubik Mono One', monospace" }}
      >
        {value}
      </span>
    </div>
  )
}

function ActionBtn({
  href,
  onClick,
  label,
  icon,
  external,
}: {
  href?: string
  onClick?: () => void
  label: string
  icon: React.ReactNode
  external?: boolean
}) {
  const cls =
    'flex items-center gap-2 w-full px-3 py-2 rounded-xl text-[11px] text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20'

  if (href) {
    return (
      <a
        href={href}
        target={external ? '_blank' : '_self'}
        rel={external ? 'noopener noreferrer' : undefined}
        className={cls}
      >
        {icon}
        {label}
      </a>
    )
  }

  return (
    <button type="button" onClick={onClick} className={cls}>
      {icon}
      {label}
    </button>
  )
}
