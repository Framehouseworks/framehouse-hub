import { LivePreviewListener } from '@/components/LivePreviewListener'
import { MotionContainer } from '@/components/Portfolio/MotionContainer'
import { PortfolioRenderer } from '@/components/Portfolio/PortfolioRenderer'
import { PortfolioThemeProvider, type ThemeConfig } from '@/components/Portfolio/PortfolioThemeProvider'
import { RichText } from '@/components/RichText'
import { auth } from '@/utilities/auth'
import configPromise from '@payload-config'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import { createHmac } from 'crypto'
import { PasswordGateClient } from './PasswordGateClient'

type Props = {
    params: Promise<{ slug: string }>
    searchParams: Promise<{ preview_token?: string }>
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
        // Constant-time string comparison (same character position checked regardless of match)
        return hmac.length === expected.length &&
          Buffer.from(hmac).every((b, i) => b === Buffer.from(expected)[i])
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
        return hmac.length === expected.length &&
          Buffer.from(hmac).every((b, i) => b === Buffer.from(expected)[i])
    } catch {
        return false
    }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    const payload = await getPayload({ config: configPromise })
    const { docs } = await payload.find({
        collection: 'portfolios',
        where: { and: [{ slug: { equals: slug } }, { visibility: { in: ['public'] } }] },
        limit: 1,
        depth: 0,
    })
    const portfolio = docs[0]
    if (!portfolio) return { title: 'Portfolio | Framehouse Hub', robots: { index: false } }
    return {
        title: portfolio.name || 'Portfolio | Framehouse Hub',
        robots: portfolio.visibility === 'public' ? { index: true } : { index: false },
    }
}

export default async function PortfolioPage({ params, searchParams }: Props) {
    const { slug } = await params
    const { preview_token } = await searchParams
    const user = await auth()
    const payload = await getPayload({ config: configPromise })
    const cookieStore = await cookies()

    // Only fetch draft content for authenticated users (C-9 / Issue #9)
    const fetchDraft = !!user

    const { docs } = await payload.find({
        collection: 'portfolios',
        where: { slug: { equals: slug } },
        limit: 1,
        depth: 3,
        draft: fetchDraft,
        user,
    })

    const portfolio = docs[0]
    if (!portfolio) return notFound()

    const hasValidPreviewToken = preview_token
        ? validatePreviewToken(preview_token, portfolio.id)
        : false

    const ownerId = typeof portfolio.owner === 'object' ? portfolio.owner.id : portfolio.owner
    const isOwner = user && ownerId === user.id
    const isAdmin = user?.roles?.includes('admin')

    const portfolioWithStatus = portfolio as typeof portfolio & { _status?: string }
    const isDraft = portfolioWithStatus._status === 'draft'

    // Block unauthenticated access to drafts (even if visibility is public)
    if (isDraft && !isOwner && !isAdmin && !hasValidPreviewToken) {
        return notFound()
    }

    // Block access to private portfolios for non-owners
    if (portfolio.visibility === 'private' && !isOwner && !isAdmin && !hasValidPreviewToken) {
        return notFound()
    }

    // Password-gated portfolios: check unlock cookie
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
            // Serve the password gate UI — do NOT pass layoutBlocks to it
            return <PasswordGateClient slug={slug} />
        }
    }

    const theme: ThemeConfig = {
        fontPairing: portfolio.theme?.fontPairing || 'modern-sans',
        backgroundColor: portfolio.theme?.backgroundColor || '#000000',
        textColor: portfolio.theme?.textColor || '#ffffff',
        accentColor: portfolio.theme?.accentColor || '#ffffff',
    }

    return (
        <PortfolioThemeProvider theme={theme}>
            <LivePreviewListener />

            {/* Preview banner: z-[100] puts it above the site header (z-50).
                The style tag below offsets the header so banner + header stack cleanly. */}
            {hasValidPreviewToken && (
                <>
                <style>{`
                  /* Push site header below the 44px preview banner */
                  [data-site-header] { top: 2.75rem !important; }
                `}</style>
                <div
                    role="status"
                    aria-label="Preview mode active"
                    className="fixed top-0 left-0 right-0 z-[100] bg-[#ff7f67] text-white text-center py-2.5 px-4 flex items-center justify-center gap-3"
                >
                    <span className="text-xs font-medium tracking-wide">
                        PREVIEW MODE — This is how your client will see this portfolio.
                    </span>
                    <span className="text-[10px] opacity-70">Close this tab to return to editing.</span>
                </div>
                </>
            )}

            <article
                className="-mt-24 sm:-mt-32 min-h-screen pb-24 not-italic rounded-none"
                style={{ paddingTop: hasValidPreviewToken ? '2.75rem' : undefined }}
            >
                <header className="py-24 sm:py-32 px-6 md:px-12 lg:px-24">
                    <MotionContainer type="staggerContainer">
                        <div className="space-y-12">
                            <div className="flex items-center gap-4">
                                <span className="text-[var(--portfolio-accent)] text-[10px] uppercase tracking-[0.5em] font-medium opacity-40">
                                    {portfolio.slug}
                                </span>
                                <div className="h-px w-12 bg-[var(--portfolio-accent)] opacity-10" />
                            </div>

                            {portfolio.title && (
                              <RichText
                                data={portfolio.title}
                                className="text-5xl md:text-7xl lg:text-8xl tracking-[-0.02em] leading-[0.9] prose-none !max-w-none not-italic"
                                enableProse={false}
                                enableGutter={false}
                              />
                            )}

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

                <PortfolioRenderer layoutBlocks={portfolio.layoutBlocks || []} />

                <footer className="mt-40 px-6 md:px-24 py-12 border-t border-[var(--portfolio-accent)] border-opacity-5">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                        <p className="text-[10px] uppercase tracking-[0.4em] opacity-30">
                            &copy; {new Date().getFullYear()} Framehouse Hub
                        </p>
                        <div className="flex items-center gap-4 text-[10px] uppercase tracking-[0.4em] opacity-30">
                            <span>Fine Art Preservation</span>
                        </div>
                    </div>
                </footer>
            </article>
        </PortfolioThemeProvider>
    )
}
