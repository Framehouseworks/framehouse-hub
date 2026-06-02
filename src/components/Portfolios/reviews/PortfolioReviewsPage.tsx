'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, User, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/utilities/cn'
import { Button } from '@/components/ui/button'
import type { PortfolioClientReview, Media } from '@/payload-types'

interface Props {
  portfolioId: number
  portfolioName: string
  initialReviews: PortfolioClientReview[]
  totalDocs: number
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function PortfolioReviewsPage({ portfolioId, portfolioName, initialReviews, totalDocs }: Props) {
  const [reviews, setReviews] = useState<PortfolioClientReview[]>(initialReviews)
  const [acknowledging, setAcknowledging] = useState<number | null>(null)

  async function handleAcknowledge(reviewId: number) {
    setAcknowledging(reviewId)
    try {
      const res = await fetch(`/api/dashboard/reviews/${reviewId}/acknowledge`, { method: 'PATCH' })
      if (!res.ok) {
        toast.error('Could not acknowledge review.')
        return
      }
      setReviews((prev) => prev.filter((r) => r.id !== reviewId))
      toast.success('Review acknowledged.')
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setAcknowledging(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/dashboard/portfolios/${portfolioId}`}
          className="flex items-center justify-center w-8 h-8 rounded-xl bg-gallery-surface/60 text-on-surface/40 hover:text-primary transition-colors"
          aria-label="Back to portfolio"
        >
          <ArrowLeft size={15} />
        </Link>
        <div>
          <h1 className="text-lg font-semibold text-primary tracking-tight">{portfolioName}</h1>
          <p className="text-xs text-on-surface/40 mt-0.5">
            {reviews.length > 0
              ? `${reviews.length} pending ${reviews.length === 1 ? 'review' : 'reviews'}`
              : 'No pending reviews'}
            {totalDocs > reviews.length && ` (of ${totalDocs} total)`}
          </p>
        </div>
      </div>

      {/* Empty state */}
      {reviews.length === 0 && (
        <div className="rounded-2xl bg-gallery-surface/40 p-12 text-center">
          <MessageSquare size={32} className="mx-auto text-on-surface/20 mb-3" />
          <p className="text-sm font-medium text-primary">No pending reviews</p>
          <p className="text-xs text-on-surface/40 mt-1">
            Client selections will appear here once submitted.
          </p>
        </div>
      )}

      {/* Review cards */}
      <div className="flex flex-col gap-4">
        {reviews.map((review) => (
          <article
            key={review.id}
            className="rounded-2xl bg-gallery-surface/40 p-5 flex flex-col gap-4"
          >
            {/* Review header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gallery-gold/15 flex items-center justify-center flex-shrink-0">
                  <User size={15} className="text-gallery-gold" />
                </div>
                <div>
                  <p className="text-sm font-medium text-primary">{review.clientName}</p>
                  {review.clientEmail && (
                    <p className="text-xs text-on-surface/40">{review.clientEmail}</p>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p
                  className="text-[10px] text-on-surface/30"
                  style={{ fontFamily: "'Rubik Mono One', monospace" }}
                >
                  {review.itemCount ?? 0} assets
                </p>
                <p className="text-[10px] text-on-surface/25 mt-0.5">{formatDate(review.submittedAt)}</p>
              </div>
            </div>

            {/* Asset thumbnails */}
            {Array.isArray(review.selectedItems) && review.selectedItems.length > 0 && (
              <div className="flex gap-2 flex-wrap" role="list" aria-label="Selected assets">
                {review.selectedItems.slice(0, 8).map((item, i) => {
                  const media = item.media && typeof item.media === 'object' ? (item.media as Media) : null
                  const thumbUrl = media?.thumbnailUrl ?? null
                  const title = item.instanceTitle || media?.title || `Asset ${i + 1}`
                  return (
                    <div
                      key={i}
                      role="listitem"
                      className="w-14 h-14 rounded-2xl bg-on-surface/8 overflow-hidden flex-shrink-0"
                      title={title}
                    >
                      {thumbUrl ? (
                        <img src={thumbUrl} alt={title} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[9px] text-on-surface/25 p-1 text-center leading-tight">
                          {title}
                        </div>
                      )}
                    </div>
                  )
                })}
                {review.selectedItems.length > 8 && (
                  <div className="w-14 h-14 rounded-2xl bg-on-surface/8 flex items-center justify-center text-xs text-on-surface/40">
                    +{review.selectedItems.length - 8}
                  </div>
                )}
              </div>
            )}

            {/* Client note */}
            {review.clientNote && (
              <div className="rounded-2xl bg-on-surface/4 px-4 py-3">
                <p className="text-xs text-on-surface/60 leading-relaxed italic">&ldquo;{review.clientNote}&rdquo;</p>
              </div>
            )}

            {/* Acknowledge action */}
            <div className="flex justify-end pt-1">
              <Button
                size="sm"
                onClick={() => handleAcknowledge(review.id)}
                disabled={acknowledging === review.id}
                className={cn(
                  'gap-2 rounded-[20px] text-xs h-8',
                  'bg-gallery-gold/15 text-gallery-gold border border-gallery-gold/30 hover:bg-gallery-gold/25',
                )}
                aria-label={`Mark review from ${review.clientName} as acknowledged`}
              >
                <Check size={12} />
                {acknowledging === review.id ? 'Acknowledging…' : 'Acknowledge'}
              </Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
