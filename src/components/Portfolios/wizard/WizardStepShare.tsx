'use client'

import React, { useState } from 'react'
import { Eye, Link2, Lock, Globe, EyeOff, ExternalLink, Loader2, MessageSquare, Download, CheckSquare, Users } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/utilities/cn'
import { Button } from '@/components/ui/button'
import { generatePreviewTokenAction } from '@/app/(dashboard)/actions/portfolios'
import type { WizardState, ClientReviewSettings } from '../types'

interface Props {
  state: WizardState
  onChange: (patch: Partial<WizardState>) => void
  portfolioId: number | null
  slug: string
  onPublish: () => void
  onSaveDraft: () => void
  publishing: boolean
  savingDraft: boolean
  previewUsed: boolean
  onPreviewUsed: () => void
}

const VISIBILITY_OPTIONS = [
  {
    value: 'private' as const,
    icon: EyeOff,
    label: 'Private',
    description: 'Only you can view this portfolio.',
  },
  {
    value: 'shared' as const,
    icon: Lock,
    label: 'Shared link',
    description: 'Anyone with the link can view. Password optional.',
  },
  {
    value: 'public' as const,
    icon: Globe,
    label: 'Public',
    description: 'Visible to anyone. May appear in search.',
  },
]

export function WizardStepShare({
  state,
  onChange,
  portfolioId,
  slug,
  onPublish,
  onSaveDraft,
  publishing,
  savingDraft,
  previewUsed,
  onPreviewUsed,
}: Props) {
  const [showPassword, setShowPassword] = useState(false)
  const [generatingPreview, setGeneratingPreview] = useState(false)
  const [skipPreview, setSkipPreview] = useState(false)

  const publicUrl = `${process.env.NEXT_PUBLIC_SERVER_URL ?? ''}/p/${slug || 'preview'}`
  const canPublish = previewUsed || skipPreview

  async function handleOpenPreview() {
    if (!portfolioId) {
      toast.error('Save a draft first to preview.')
      return
    }
    setGeneratingPreview(true)
    const result = await generatePreviewTokenAction(portfolioId)
    setGeneratingPreview(false)

    if (!result.success || !result.data) {
      toast.error('Could not generate preview. Try saving first.')
      return
    }

    const previewUrl = `${process.env.NEXT_PUBLIC_SERVER_URL ?? ''}/p/${slug}?preview_token=${result.data.token}`
    window.open(previewUrl, '_blank', 'noopener,noreferrer')
    onPreviewUsed()
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(publicUrl)
    toast.success('Link copied to clipboard')
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full min-w-0">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight text-primary">Preview & publish</h2>
        <p className="text-xs text-on-surface/40">
          See exactly what your client will see before making this live.
        </p>
      </div>

      {/* Preview as client CTA */}
      <div className="rounded-2xl border border-gallery-gold/20 bg-gallery-gold/5 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-primary">Preview as client</p>
          <p className="text-xs text-on-surface/40 mt-0.5">
            Opens a temporary full-page preview — signed URLs, password prompt, mobile layout.
          </p>
        </div>
        <Button
          onClick={handleOpenPreview}
          disabled={generatingPreview || !portfolioId}
          className={cn(
            'gap-2 rounded-[20px] flex-shrink-0',
            previewUsed
              ? 'bg-gallery-gold/15 text-gallery-gold border border-gallery-gold/30 hover:bg-gallery-gold/20'
              : 'bg-primary text-primary-foreground hover:bg-gallery-gold',
          )}
          aria-label="Preview portfolio as client"
        >
          {generatingPreview ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <ExternalLink size={14} />
          )}
          {previewUsed ? 'Preview again' : 'Preview'}
        </Button>
      </div>

      {/* Visibility */}
      <div>
        <p className="font-rubik text-[9px] tracking-[0.2em] text-on-surface/40 uppercase mb-3">
          Visibility
        </p>
        <div className="flex flex-col gap-2">
          {VISIBILITY_OPTIONS.map(({ value, icon: Icon, label, description }) => (
            <button
              key={value}
              onClick={() => onChange({ visibility: value })}
              aria-pressed={state.visibility === value}
              className={cn(
                'flex items-center gap-4 px-4 py-3.5 rounded-2xl border text-left transition-all',
                state.visibility === value
                  ? 'border-gallery-gold/40 bg-gallery-gold/8'
                  : 'border-on-surface/8 hover:border-on-surface/20',
              )}
            >
              <Icon
                size={16}
                className={cn(
                  state.visibility === value ? 'text-gallery-gold' : 'text-on-surface/30',
                )}
              />
              <div>
                <p className="text-sm font-medium text-primary">{label}</p>
                <p className="text-xs text-on-surface/40">{description}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Password (shared only) */}
        {state.visibility === 'shared' && (
          <div className="mt-3 space-y-1.5">
            <label
              htmlFor="portfolio-password"
              className="font-rubik text-[9px] tracking-[0.2em] text-on-surface/40 uppercase block"
            >
              Password (optional)
            </label>
            <div className="relative">
              <input
                id="portfolio-password"
                type={showPassword ? 'text' : 'password'}
                value={state.password ?? ''}
                onChange={(e) => onChange({ password: e.target.value })}
                placeholder="e.g. NikeAW26"
                className="w-full bg-gallery-surface/60 rounded-2xl px-4 py-3 pr-10 text-sm text-primary placeholder:text-on-surface/30 border border-transparent focus:border-gallery-gold/40 focus:outline-none"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface/30 hover:text-on-surface/60"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <p className="text-[10px] text-on-surface/25">
              Client enters this password when they open the link.
            </p>
          </div>
        )}

        {/* Public warning */}
        {state.visibility === 'public' && (
          <p className="mt-2 text-[11px] text-[#bb1800]/70 flex items-center gap-1.5">
            <Globe size={11} />
            Public portfolios may appear in search engines and be indexed.
          </p>
        )}
      </div>

      {/* Client Review Settings */}
      <div>
        <p className="font-rubik text-[9px] tracking-[0.2em] text-on-surface/40 uppercase mb-3">
          Client Review Portal
        </p>
        <div className="rounded-2xl border border-on-surface/8 overflow-hidden divide-y divide-on-surface/8">
          {(
            [
              { key: 'allowSelection', icon: CheckSquare, label: 'Asset Selection', description: 'Clients can select assets and submit a shortlist.' },
              { key: 'allowComments', icon: MessageSquare, label: 'Comments', description: 'Clients can leave notes on individual assets.' },
              { key: 'allowDownload', icon: Download, label: 'Downloads', description: 'Clients can download selected assets as a zip.' },
              { key: 'requireClientIdentification', icon: Users, label: 'Require Identification', description: 'Ask clients for their name before submitting.' },
            ] as const
          ).map(({ key, icon: Icon, label, description }) => (
            <button
              key={key}
              type="button"
              onClick={() => onChange({
                clientReviewSettings: {
                  ...state.clientReviewSettings,
                  [key]: !state.clientReviewSettings[key as keyof ClientReviewSettings],
                },
              })}
              aria-pressed={Boolean(state.clientReviewSettings[key as keyof ClientReviewSettings])}
              className="flex items-center gap-4 w-full px-4 py-3 text-left transition-colors hover:bg-gallery-gold/4"
            >
              <Icon size={15} className={cn(state.clientReviewSettings[key as keyof ClientReviewSettings] ? 'text-gallery-gold' : 'text-on-surface/25')} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-primary">{label}</p>
                <p className="text-xs text-on-surface/40">{description}</p>
              </div>
              <div className={cn('w-9 h-5 rounded-full flex-shrink-0 relative transition-colors', state.clientReviewSettings[key as keyof ClientReviewSettings] ? 'bg-gallery-gold' : 'bg-on-surface/12')}>
                <div className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform', state.clientReviewSettings[key as keyof ClientReviewSettings] ? 'right-0.5 translate-x-0' : 'left-0.5')} />
              </div>
            </button>
          ))}
        </div>

        {/* Selection limit */}
        {state.clientReviewSettings.allowSelection && (
          <div className="mt-3 space-y-1.5">
            <label htmlFor="selection-limit" className="font-rubik text-[9px] tracking-[0.2em] text-on-surface/40 uppercase block">
              Selection limit <span className="normal-case tracking-normal text-on-surface/25">(0 = unlimited)</span>
            </label>
            <input
              id="selection-limit"
              type="number"
              min={0}
              max={200}
              value={state.clientReviewSettings.selectionLimit}
              onChange={(e) => onChange({ clientReviewSettings: { ...state.clientReviewSettings, selectionLimit: Math.max(0, Math.min(200, parseInt(e.target.value) || 0)) } })}
              className="w-full bg-gallery-surface/60 rounded-2xl px-4 py-3 text-sm text-primary border border-transparent focus:border-gallery-gold/40 focus:outline-none"
            />
          </div>
        )}

        {/* Download quality */}
        {state.clientReviewSettings.allowDownload && (
          <div className="mt-3 space-y-1.5">
            <p className="font-rubik text-[9px] tracking-[0.2em] text-on-surface/40 uppercase">Download quality</p>
            <div className="flex gap-2">
              {(['proxy', 'original'] as const).map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={q === 'original' && state.visibility === 'public'}
                  onClick={() => onChange({ clientReviewSettings: { ...state.clientReviewSettings, downloadQuality: q } })}
                  aria-pressed={state.clientReviewSettings.downloadQuality === q}
                  className={cn(
                    'flex-1 px-3 py-2.5 rounded-2xl text-xs border transition-all',
                    state.clientReviewSettings.downloadQuality === q
                      ? 'border-gallery-gold/40 bg-gallery-gold/8 text-primary'
                      : 'border-on-surface/8 text-on-surface/40 hover:border-on-surface/20',
                    q === 'original' && state.visibility === 'public' && 'opacity-40 cursor-not-allowed',
                  )}
                >
                  {q === 'proxy' ? 'Preview Quality' : 'Full Resolution'}
                </button>
              ))}
            </div>
            {state.clientReviewSettings.downloadQuality === 'original' && state.visibility === 'public' && (
              <p className="text-[11px] text-[#bb1800]/70">Full resolution downloads require a non-public portfolio.</p>
            )}
          </div>
        )}

        {/* Review prompt message */}
        {(state.clientReviewSettings.allowSelection || state.clientReviewSettings.allowComments) && (
          <div className="mt-3 space-y-1.5">
            <label htmlFor="review-message" className="font-rubik text-[9px] tracking-[0.2em] text-on-surface/40 uppercase block">
              Review prompt <span className="normal-case tracking-normal text-on-surface/25">(optional)</span>
            </label>
            <input
              id="review-message"
              type="text"
              maxLength={300}
              value={state.clientReviewSettings.reviewMessage}
              onChange={(e) => onChange({ clientReviewSettings: { ...state.clientReviewSettings, reviewMessage: e.target.value } })}
              placeholder="e.g. Please select your 5 favourite images for the campaign."
              className="w-full bg-gallery-surface/60 rounded-2xl px-4 py-3 text-sm text-primary placeholder:text-on-surface/30 border border-transparent focus:border-gallery-gold/40 focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Share link copy */}
      {state.visibility !== 'private' && slug && (
        <div className="rounded-2xl bg-on-surface/4 px-4 py-3 flex items-center justify-between gap-3">
          <span className="font-mono text-[11px] text-on-surface/40 truncate">/p/{slug}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyLink}
            className="gap-1.5 rounded-xl text-gallery-gold hover:bg-gallery-gold/10 flex-shrink-0"
            aria-label="Copy share link"
          >
            <Link2 size={13} />
            Copy
          </Button>
        </div>
      )}

      {/* Publish actions */}
      <div className="flex flex-col gap-3 pt-2 border-t border-on-surface/8">
        {!previewUsed && !skipPreview && (
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={skipPreview}
              onChange={(e) => setSkipPreview(e.target.checked)}
              className="rounded"
              id="skip-preview"
            />
            <span className="text-xs text-on-surface/40">
              Skip preview, publish now
            </span>
          </label>
        )}

        <Button
          onClick={onPublish}
          disabled={publishing || !canPublish}
          className="w-full h-12 text-sm rounded-[24px] gap-2 bg-primary hover:bg-gallery-gold font-medium"
          aria-label="Publish portfolio"
        >
          {publishing ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Publishing…
            </>
          ) : (
            'Publish Portfolio'
          )}
        </Button>

        {!canPublish && (
          <p className="text-[10px] text-on-surface/30 text-center" role="status">
            Preview your portfolio before publishing or check &ldquo;Skip preview&rdquo;.
          </p>
        )}

        <Button
          variant="ghost"
          onClick={onSaveDraft}
          disabled={savingDraft}
          className="w-full h-10 text-sm rounded-[20px] text-on-surface/50 hover:text-primary"
          aria-label="Save as draft"
        >
          {savingDraft ? 'Saving…' : 'Save draft'}
        </Button>
      </div>
    </div>
  )
}
