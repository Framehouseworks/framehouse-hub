import { MotionContainer } from '@/components/Portfolio/MotionContainer'
import { PortfolioRenderer } from '@/components/Portfolio/PortfolioRenderer'
import { PortfolioThemeProvider } from '@/components/Portfolio/PortfolioThemeProvider'
import { auth } from '@/utilities/auth'
import configPromise from '@payload-config'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

type Props = {
    params: Promise<{
        slug: string
    }>
}

export default async function PortfolioPage({ params }: Props) {
    const { slug } = await params
    const user = await auth()
    const payload = await getPayload({ config: configPromise })

    const { docs } = await payload.find({
        collection: 'portfolios',
        where: {
            slug: {
                equals: slug,
            },
        },
        limit: 1,
        user,
    })

    const portfolio = docs[0]

    if (!portfolio) {
        return notFound()
    }

    // Access check
    const canView = portfolio.visibility !== 'private' ||
        (user && (typeof portfolio.owner === 'object' ? portfolio.owner.id : portfolio.owner) === user?.id) ||
        user?.roles?.includes('admin')

    if (!canView) {
        return notFound()
    }

    // Normalize theme to handle nulls from Payload
    const theme = {
        fontPairing: portfolio.theme?.fontPairing || 'modern-sans',
        backgroundColor: portfolio.theme?.backgroundColor || '#000000',
        textColor: portfolio.theme?.textColor || '#ffffff',
        accentColor: portfolio.theme?.accentColor || '#ffffff',
    } as const

    return (
        <PortfolioThemeProvider theme={theme as any}>
            <article className="min-h-screen pb-24">
                {/* Premium Portfolio Header */}
                <header className="py-32 px-6 md:px-12 lg:px-24">
                    <MotionContainer type="staggerContainer">
                        <div className="space-y-8">
                            <div className="flex items-center gap-4">
                                <div className="h-px flex-1 bg-[var(--portfolio-accent)] opacity-20" />
                                <span className="text-[var(--portfolio-accent)] text-xs uppercase tracking-[0.4em] font-medium opacity-60">
                                    Portfolio / {portfolio.slug}
                                </span>
                            </div>

                            <h1 className="text-6xl md:text-8xl lg:text-9xl font-bold tracking-tighter leading-none italic uppercase">
                                {portfolio.title}
                            </h1>

                            {portfolio.subheading && (
                                <div className="max-w-4xl">
                                    <p className="text-xl md:text-3xl font-light tracking-tight leading-relaxed opacity-80 italic">
                                        {portfolio.subheading}
                                    </p>
                                </div>
                            )}
                        </div>
                    </MotionContainer>
                </header>

                {/* Dynamic Block Renderer */}
                <PortfolioRenderer layoutBlocks={portfolio.layoutBlocks || []} />

                <footer className="mt-40 px-6 md:px-24 py-12 border-t border-[var(--portfolio-accent)] border-opacity-10">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                        <p className="text-xs uppercase tracking-[0.3em] opacity-40">
                            &copy; {new Date().getFullYear()} Framehouse Hub Portfolio
                        </p>
                        <div className="flex items-center gap-4 text-xs uppercase tracking-[0.3em] opacity-40">
                            <span>Built with Framehouse</span>
                        </div>
                    </div>
                </footer>
            </article>
        </PortfolioThemeProvider>
    )
}
