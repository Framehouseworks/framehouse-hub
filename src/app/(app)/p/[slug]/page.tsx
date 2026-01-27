import { LivePreviewListener } from '@/components/LivePreviewListener'
import { MotionContainer } from '@/components/Portfolio/MotionContainer'
import { PortfolioRenderer } from '@/components/Portfolio/PortfolioRenderer'
import { PortfolioThemeProvider } from '@/components/Portfolio/PortfolioThemeProvider'
import { RichText } from '@/components/RichText'
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
            <LivePreviewListener />
            <article className="min-h-screen pb-24 not-italic rounded-none">
                {/* Minimalist Portfolio Header */}
                <header className="py-32 px-6 md:px-12 lg:px-24">
                    <MotionContainer type="staggerContainer">
                        <div className="space-y-12">
                            <div className="flex items-center gap-4">
                                <span className="text-[var(--portfolio-accent)] text-[10px] uppercase tracking-[0.5em] font-medium opacity-40">
                                    {portfolio.slug}
                                </span>
                                <div className="h-px w-12 bg-[var(--portfolio-accent)] opacity-10" />
                            </div>

                            <RichText
                                data={portfolio.title}
                                className="text-5xl md:text-7xl lg:text-8xl tracking-[ -0.02em] leading-[0.9] prose-none !max-w-none not-italic"
                                enableProse={false}
                                enableGutter={false}
                            />

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

                {/* Dynamic Block Renderer */}
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
