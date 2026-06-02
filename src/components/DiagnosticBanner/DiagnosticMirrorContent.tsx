import React from 'react'
import Link from 'next/link'
import {
  BookImage,
  Archive,
  ExternalLink,
  Lock,
  Globe,
  Eye,
  Download,
  Image as ImageIcon,
  Settings,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/utilities/cn'
import type { Portfolio, User, Media } from '@/payload-types'

function VisibilityBadge({ visibility }: { visibility: string | null | undefined }) {
  const config = {
    private: { label: 'Private', bg: 'bg-on-surface/10', text: 'text-on-surface/50', Icon: Lock },
    public: { label: 'Public', bg: 'bg-green-100 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-400', Icon: Globe },
    shared: { label: 'Password', bg: 'bg-amber-100 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400', Icon: Lock },
  }
  const { label, bg, text, Icon } = config[visibility as keyof typeof config] ?? config.private
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-xl text-xs font-rubik', bg, text)}>
      <Icon size={10} aria-hidden />
      {label}
    </span>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string | number
  icon: React.ElementType
}) {
  return (
    <div className="bg-gallery-surface rounded-2xl p-4 sm:p-5 shadow-[0px_20px_40px_rgba(26,28,28,0.06)] flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center shrink-0">
        <Icon size={18} className="text-gallery-gold" aria-hidden />
      </div>
      <div>
        <p className="text-xl sm:text-2xl font-bold text-on-surface font-inter leading-none">{value}</p>
        <p className="font-rubik text-[9px] tracking-widest text-on-surface/40 uppercase mt-1">{label}</p>
      </div>
    </div>
  )
}

interface Props {
  targetCreative: User
  portfolios: Portfolio[]
  totalPortfolios: number
  recentMedia: Media[]
  totalMedia: number
  adminId: string
}

export function DiagnosticMirrorContent({
  targetCreative,
  portfolios,
  totalPortfolios,
  recentMedia,
  totalMedia,
  adminId: _adminId,
}: Props) {
  const displayName = targetCreative.name ?? targetCreative.email

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold"
              style={{ backgroundColor: '#ff7f6722', color: '#bb1800' }}
            >
              <Eye size={11} aria-hidden />
              Read-only diagnostic view
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-on-surface font-inter">
            {displayName}
          </h1>
          <p className="text-on-surface/50 text-sm mt-1">{targetCreative.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/collections/users/${targetCreative.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gallery-surface hover:bg-gallery-surface/80 text-on-surface rounded-2xl text-sm font-medium transition-colors"
          >
            <Settings size={14} aria-hidden />
            Edit Account
            <ExternalLink size={12} aria-hidden />
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Media Items" value={totalMedia} icon={Archive} />
        <StatCard label="Portfolios" value={totalPortfolios} icon={BookImage} />
        <StatCard label="Roles" value={(targetCreative.roles ?? ['viewer']).join(', ')} icon={Settings} />
        <StatCard label="User ID" value={String(targetCreative.id).slice(0, 8)} icon={Eye} />
      </div>

      {/* Portfolios */}
      <section aria-labelledby="portfolios-heading">
        <div className="flex items-center justify-between mb-4">
          <h2 id="portfolios-heading" className="text-lg font-bold text-on-surface font-inter">
            Portfolios
            {totalPortfolios > 0 && (
              <span className="ml-2 font-rubik text-xs text-on-surface/40">{totalPortfolios}</span>
            )}
          </h2>
          <Link
            href={`/admin/collections/portfolios?where[owner][equals]=${targetCreative.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gallery-gold hover:underline inline-flex items-center gap-1"
          >
            View all in admin <ArrowRight size={12} aria-hidden />
          </Link>
        </div>

        {portfolios.length === 0 ? (
          <div className="bg-gallery-surface rounded-2xl p-8 text-center">
            <BookImage size={32} className="text-on-surface/20 mx-auto mb-3" aria-hidden />
            <p className="text-on-surface/50 text-sm">No portfolios yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {portfolios.map((portfolio) => {
              const itemCount = portfolio.layoutBlocks?.reduce((acc, block) => {
                if (block.blockType === 'grid' && 'items' in block && Array.isArray(block.items)) {
                  return acc + block.items.length
                }
                return acc
              }, 0) ?? 0

              const layoutStyles = portfolio.layoutBlocks
                ?.filter((b) => b.blockType === 'grid')
                .map((b) => 'layoutStyle' in b ? b.layoutStyle : null)
                .filter(Boolean)
                .filter((v, i, a) => a.indexOf(v) === i)
                .slice(0, 2)
                .join(', ')

              return (
                <div
                  key={portfolio.id}
                  className="bg-gallery-surface rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 shadow-[0px_20px_40px_rgba(26,28,28,0.04)]"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-semibold text-on-surface text-sm truncate">
                        {portfolio.name}
                      </span>
                      <VisibilityBadge visibility={portfolio.visibility} />
                      {portfolio._status === 'draft' && (
                        <span className="inline-block px-2 py-0.5 rounded-xl bg-on-surface/10 text-on-surface/50 text-xs font-rubik">
                          DRAFT
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-on-surface/40 font-rubik">
                      {portfolio.slug && (
                        <span>/{portfolio.slug}</span>
                      )}
                      {itemCount > 0 && <span>{itemCount} items</span>}
                      {layoutStyles && <span>{layoutStyles}</span>}
                      {portfolio.clientReviewSettings?.allowDownload && (
                        <span className="flex items-center gap-1">
                          <Download size={10} aria-hidden /> Downloads on
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    {portfolio.slug && portfolio.visibility !== 'private' && (
                      <Link
                        href={`/p/${portfolio.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-background hover:bg-gallery-surface text-on-surface rounded-xl text-xs font-medium transition-colors"
                        aria-label={`View public portfolio ${portfolio.name}`}
                      >
                        <Globe size={12} aria-hidden />
                        View
                      </Link>
                    )}
                    <Link
                      href={`/admin/collections/portfolios/${portfolio.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors"
                      style={{ backgroundColor: '#d79922', color: '#1a1c1c' }}
                      aria-label={`Edit portfolio ${portfolio.name} in admin`}
                    >
                      <Settings size={12} aria-hidden />
                      Edit
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Recent Media */}
      <section aria-labelledby="media-heading">
        <div className="flex items-center justify-between mb-4">
          <h2 id="media-heading" className="text-lg font-bold text-on-surface font-inter">
            Recent Media
            {totalMedia > 0 && (
              <span className="ml-2 font-rubik text-xs text-on-surface/40">{totalMedia} total</span>
            )}
          </h2>
          <Link
            href={`/admin/collections/media?where[owner][equals]=${targetCreative.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gallery-gold hover:underline inline-flex items-center gap-1"
          >
            View all in admin <ArrowRight size={12} aria-hidden />
          </Link>
        </div>

        {recentMedia.length === 0 ? (
          <div className="bg-gallery-surface rounded-2xl p-8 text-center">
            <ImageIcon size={32} className="text-on-surface/20 mx-auto mb-3" aria-hidden />
            <p className="text-on-surface/50 text-sm">No media uploaded yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {recentMedia.map((item) => {
              const src =
                (item as { thumbnailUrl?: string; proxyUrl?: string; originalUrl?: string; url?: string })
                  .thumbnailUrl ??
                (item as { proxyUrl?: string }).proxyUrl ??
                (item as { originalUrl?: string }).originalUrl ??
                (item as { url?: string }).url ??
                null

              return (
                <Link
                  key={item.id}
                  href={`/admin/collections/media/${item.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group aspect-square bg-gallery-surface rounded-xl overflow-hidden relative"
                  aria-label={`View media item ${item.title ?? item.id} in admin`}
                >
                  {src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={src}
                      alt={item.alt ?? item.title ?? ''}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon size={16} className="text-on-surface/20" aria-hidden />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200" />
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* Read-only notice */}
      <div
        className="rounded-2xl px-5 py-4 text-sm text-center"
        style={{ backgroundColor: '#ff7f6715', color: '#bb1800' }}
        role="status"
      >
        <strong>Read-only view.</strong> Navigate to Payload admin links above to make changes. All
        actions are logged to the admin audit trail.
      </div>
    </div>
  )
}
