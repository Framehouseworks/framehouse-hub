import { AdminSupportOverlay } from '@/components/Portfolio/AdminSupportOverlay'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import { MotionContainer } from '@/components/Portfolio/MotionContainer'
import { PortfolioRenderer } from '@/components/Portfolio/PortfolioRenderer'
import { PortfolioThemeProvider, type ThemeConfig } from '@/components/Portfolio/PortfolioThemeProvider'
import { RichText } from '@/components/RichText'
import { auth } from '@/utilities/auth'
import configPromise from '@payload-config'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import { createHmac } from 'crypto'
import type { Portfolio, User } from '@/payload-types'
import { PasswordGateClient } from './PasswordGateClient'
import type { ReviewConfig } from '@/components/Portfolio/review/ReviewModeProvider'

function buildReviewConfig(portfolio: Portfolio, slug: string): ReviewConfig | null {
  const s = portfolio.clientReviewSettings
  if (!s?.allowSelection && !s?.allowComments && !s?.allowDownload) return null
  const owner = typeof portfolio.owner === 'object' ? portfolio.owner as User : null
  return {
    allowSelection: s?.allowSelection ?? false,
    allowComments: s?.allowComments ?? false,
    allowDownload: s?.allowDownload ?? false,
    requireClientIdentification: s?.requireClientIdentification ?? false,
    selectionLimit: s?.selectionLimit ?? 0,
    downloadQuality: (s?.downloadQuality as 'proxy' | 'original') ?? 'proxy',
    reviewMessage: s?.reviewMessage ?? null,
    portfolioSlug: slug,
    portfolioName: portfolio.name,
    ownerName: owner?.name ?? undefined,
  }
}

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ preview_token?: string }>
}

// Extract portfolio ID from token without validating HMAC (used to unlock access-control bypass)
function getPortfolioIdFromToken(token: string): number | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8')
    const parts = decoded.split(':')
    if (parts.length !== 3) return null
    const id = Number(parts[0])
    return isNaN(id) ? null : id
  } catch {
    return null
  }
}

function validatePreviewToken(token: string, portfolioId: number): boolean {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8')
    const parts = decoded.split(':')
    if (parts.length !== 3) return false
    const [idStr, expiresAtStr, hmac] = parts
    if (Number(idStr) !== portfolioId) return false
    if (Date.now() > Number(expiresAtStr)) return false
    const secret = process.env.PAYLOAD_SECRET || 'fallback-secret'
    const payload = `${idStr}:${expiresAtStr}`
    const expected = createHmac('sha256', secret).update(payload).digest('hex')
    return (
      hmac.length === expected.length &&
      Buffer.from(hmac).every((b, i) => b === Buffer.from(expected)[i])
    )
  } catch {
    return false
  }
}

function validateUnlockCookie(token: string, portfolioId: number): boolean {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8')
    const parts = decoded.split(':')
    if (parts.length !== 3) return false
    const [idStr, expiresAtStr, hmac] = parts
    if (Number(idStr) !== portfolioId) return false
    if (Date.now() > Number(expiresAtStr)) return false
    const secret = process.env.PAYLOAD_SECRET || 'fallback-secret'
    const payload = `${idStr}:${expiresAtStr}`
    const expected = createHmac('sha256', secret).update(payload).digest('hex')
    return (
      hmac.length === expected.length &&
      Buffer.from(hmac).every((b, i) => b === Buffer.from(expected)[i])
    )
  } catch {
    return false
  }
}

function getPreviewExpiry(token: string): number | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8')
    const parts = decoded.split(':')
    if (parts.length !== 3) return null
    return Number(parts[1])
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const payload = await getPayload({ config: configPromise })
  const { docs } = await payload.find({
    collection: 'portfolios',
    where: { and: [{ slug: { equals: slug } }, { visibility: { in: ['public'] } }] },
    limit: 1,
    depth: 1,
  })
  const portfolio = docs[0]
  if (!portfolio) {
    return { title: 'Portfolio | Framehouse Hub', robots: { index: false } }
  }

  const title = portfolio.name || 'Portfolio | Framehouse Hub'
  const ownerName =
    portfolio.owner && typeof portfolio.owner === 'object'
      ? (portfolio.owner as User).name ?? undefined
      : undefined
  const description = ownerName ? `A portfolio by ${ownerName}` : 'Framehouse Hub Portfolio'

  // OG image: first thumbnail from first grid block (signed URL — may expire, acceptable for v1)
  let ogImageUrl: string | undefined
  for (const block of portfolio.layoutBlocks ?? []) {
    if (block.blockType !== 'grid') continue
    const firstItem = (block.items ?? [])[0]
    if (firstItem && firstItem.media && typeof firstItem.media === 'object') {
      const media = firstItem.media as { thumbnailUrl?: string | null; url?: string | null }
      ogImageUrl = media.thumbnailUrl ?? media.url ?? undefined
    }
    if (ogImageUrl) break
  }

  return {
    title,
    description,
    robots: portfolio.visibility === 'public' ? { index: true, follow: true } : { index: false },
    openGraph: {
      title,
      description,
      type: 'website',
      ...(ogImageUrl ? { images: [{ url: ogImageUrl }] } : {}),
    },
    twitter: {
      card: ogImageUrl ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(ogImageUrl ? { images: [ogImageUrl] } : {}),
    },
  }
}

// Always fetch fresh — portfolio pages contain signed URLs (1h TTL)
export const dynamic = 'force-dynamic'

export default async function PortfolioPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { preview_token } = await searchParams
  const user = await auth()
  const payload = await getPayload({ config: configPromise })
  const cookieStore = await cookies()

  const fetchDraft = !!user

  // When a preview_token is present, bypass collection access control so
  // unauthenticated recipients of a shared preview link can still load
  // private/draft portfolios. HMAC validation below confirms the token is
  // genuine — the bypass is safe only after that check.
  const tokenPortfolioId = preview_token ? getPortfolioIdFromToken(preview_token) : null
  const useAccessBypass = !!(preview_token && tokenPortfolioId)

  const { docs } = await payload.find({
    collection: 'portfolios',
    where: useAccessBypass
      ? { and: [{ slug: { equals: slug } }, { id: { equals: tokenPortfolioId } }] }
      : { slug: { equals: slug } },
    limit: 1,
    depth: 3,
    draft: useAccessBypass ? true : fetchDraft,
    ...(useAccessBypass ? { overrideAccess: true } : { user }),
  })

  const portfolio = docs[0]
  if (!portfolio) return notFound()

  const hasValidPreviewToken = preview_token
    ? validatePreviewToken(preview_token, portfolio.id)
    : false

  // If we bypassed access control to load a draft/private portfolio, the token
  // MUST be valid — otherwise an attacker could probe slugs with a malformed token.
  if (useAccessBypass && !hasValidPreviewToken) return notFound()

  const ownerId =
    typeof portfolio.owner === 'object' ? (portfolio.owner as User).id : portfolio.owner
  const isOwner = !!(user && ownerId === user.id)
  const isAdmin = !!(user?.roles?.includes('admin'))

  const portfolioWithStatus = portfolio as typeof portfolio & { _status?: string }
  const isDraft = portfolioWithStatus._status === 'draft'

  if (isDraft && !isOwner && !isAdmin && !hasValidPreviewToken) return notFound()
  if (portfolio.visibility === 'private' && !isOwner && !isAdmin && !hasValidPreviewToken) return notFound()

  const requiresPassword =
    !hasValidPreviewToken &&
    !isOwner &&
    !isAdmin &&
    portfolio.visibility === 'shared' &&
    !!portfolio.password

  if (requiresPassword) {
    const unlockCookie = cookieStore.get(`portfolio_unlock_${portfolio.id}`)?.value
    const isUnlocked = unlockCookie ? validateUnlockCookie(unlockCookie, portfolio.id) : false

    if (!isUnlocked) {
      const theme: ThemeConfig = {
        fontPairing: portfolio.theme?.fontPairing || 'modern-sans',
        backgroundColor: portfolio.theme?.backgroundColor || '#0a0a0a',
        textColor: portfolio.theme?.textColor || '#ffffff',
        accentColor: portfolio.theme?.accentColor || '#ffffff',
      }
      return (
        <PasswordGateClient
          slug={slug}
          portfolioName={portfolio.name}
          theme={theme}
        />
      )
    }
  }

  const theme: ThemeConfig = {
    fontPairing: portfolio.theme?.fontPairing || 'modern-sans',
    backgroundColor: portfolio.theme?.backgroundColor || '#000000',
    textColor: portfolio.theme?.textColor || '#ffffff',
    accentColor: portfolio.theme?.accentColor || '#ffffff',
  }

  // Compute remaining preview token time for expiry hint
  const previewExpiresAt = hasValidPreviewToken && preview_token
    ? getPreviewExpiry(preview_token)
    : null
  const previewMinsRemaining = previewExpiresAt
    ? Math.max(0, Math.floor((previewExpiresAt - Date.now()) / 60000))
    : null

  // Owner email for admin overlay
  const ownerEmail =
    portfolio.owner && typeof portfolio.owner === 'object'
      ? (portfolio.owner as User).email ?? ''
      : ''

  return (
    <PortfolioThemeProvider theme={theme}>
      {/* Live preview for admin sessions with a preview token */}
      {isAdmin && hasValidPreviewToken && <LivePreviewListener />}

      {/* ── Preview banner ───────────────────────────────────────────────── */}
      {hasValidPreviewToken && (
        <div
          role="status"
          aria-label="Preview mode active"
          className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-3 px-4 py-2.5 text-center"
          style={{ backgroundColor: '#ff7f67', height: '44px' }}
        >
          <span className="text-white text-[11px] font-medium tracking-wide uppercase">
            Preview Mode
            {previewMinsRemaining !== null && previewMinsRemaining < 30
              ? ` — expires in ${previewMinsRemaining}m`
              : ' — share this link to preview before publishing'}
          </span>
          <span className="text-white/60 text-[10px] hidden sm:inline">
            Close this tab to return to editing.
          </span>
        </div>
      )}

      <article
        className="min-h-screen pb-24"
        style={{ paddingTop: hasValidPreviewToken ? '44px' : undefined }}
      >
        {/* ── Portfolio header ──────────────────────────────────────────── */}
        <header className="py-24 sm:py-32 px-6 md:px-12 lg:px-24">
          <MotionContainer type="staggerContainer">
            <div className="space-y-12">
              {/* Slug breadcrumb */}
              <div className="flex items-center gap-4">
                <span
                  className="text-[var(--portfolio-accent)] text-[10px] uppercase tracking-[0.5em] font-medium opacity-40"
                  style={{ fontFamily: "'Rubik Mono One', monospace" }}
                >
                  {portfolio.slug}
                </span>
                <div className="h-px w-12 bg-[var(--portfolio-accent)] opacity-10" />
              </div>

              {/* Title */}
              {portfolio.title && (
                <RichText
                  data={portfolio.title}
                  className="text-5xl md:text-7xl lg:text-8xl tracking-[-0.02em] leading-[0.9] prose-none !max-w-none not-italic"
                  enableProse={false}
                  enableGutter={false}
                />
              )}

              {/* Subheading */}
              {portfolio.subheading && (
                <div className="max-w-3xl">
                  <RichText
                    data={portfolio.subheading}
                    className="text-lg md:text-xl font-normal tracking-widest leading-relaxed opacity-50 uppercase not-italic"
                    enableProse={false}
                    enableGutter={false}
                  />
                </div>
              )}
            </div>
          </MotionContainer>
        </header>

        {/* ── Layout blocks ─────────────────────────────────────────────── */}
        <PortfolioRenderer
          layoutBlocks={portfolio.layoutBlocks || []}
          reviewConfig={
            !hasValidPreviewToken && !isAdmin && portfolioWithStatus._status === 'published'
              ? buildReviewConfig(portfolio, slug)
              : null
          }
        />

        {/* ── Portfolio footer ──────────────────────────────────────────── */}
        <footer className="mt-24 px-6 md:px-24 py-10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <p
              className="text-[10px] uppercase tracking-[0.4em] opacity-20"
              style={{ fontFamily: "'Rubik Mono One', monospace" }}
            >
              &copy; {new Date().getFullYear()}
              {typeof portfolio.owner === 'object' && (portfolio.owner as User).name
                ? ` ${(portfolio.owner as User).name}`
                : ''}
            </p>
            <div className="flex items-center gap-4 text-[10px] uppercase tracking-[0.4em] opacity-20">
              {portfolio.visibility === 'shared' && (
                <span style={{ fontFamily: "'Rubik Mono One', monospace" }}>Protected Gallery</span>
              )}
              <span style={{ fontFamily: "'Rubik Mono One', monospace" }}>Framehouse Hub</span>
            </div>
          </div>
        </footer>
      </article>

      {/* ── Admin support overlay (admin users only) ─────────────────────── */}
      {isAdmin && (
        <AdminSupportOverlay
          portfolioId={portfolio.id}
          portfolioName={portfolio.name}
          portfolioSlug={portfolio.slug ?? slug}
          ownerEmail={ownerEmail}
          status={portfolioWithStatus._status ?? 'unknown'}
          visibility={portfolio.visibility ?? 'private'}
          updatedAt={portfolio.updatedAt}
          reviewSettings={{
            allowSelection: portfolio.clientReviewSettings?.allowSelection ?? false,
            allowComments: portfolio.clientReviewSettings?.allowComments ?? false,
            allowDownload: portfolio.clientReviewSettings?.allowDownload ?? false,
          }}
        />
      )}
    </PortfolioThemeProvider>
  )
}
