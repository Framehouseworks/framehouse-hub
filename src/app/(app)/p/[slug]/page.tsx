import { Separator } from '@/components/ui/separator'
import { auth } from '@/utilities/auth'
import configPromise from '@payload-config'
import Image from 'next/image'
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
        user, // Pass the user to satisfy the 'read' access logic
    })

    const portfolio = docs[0]

    if (!portfolio) {
        return notFound()
    }

    // Allow view if:
    // 1. It is not private (Public/Shared)
    // 2. The viewer is the owner
    // 3. The viewer is an admin
    const canView = portfolio.visibility !== 'private' ||
        (user && typeof portfolio.owner === 'object' ? portfolio.owner.id : portfolio.owner) === user?.id ||
        user?.roles?.includes('admin')

    if (!canView) {
        return notFound()
    }

    return (
        <article className="min-h-screen bg-black text-white pb-24">
            {/* Portfolio Header */}
            <header className="container max-w-7xl mx-auto py-20 px-6 text-center space-y-6">
                <div className="space-y-4">
                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase italic">
                        {portfolio.title}
                    </h1>
                    {portfolio.subheading && (
                        <p className="text-xl md:text-2xl text-zinc-400 font-light tracking-wide max-w-3xl mx-auto">
                            {portfolio.subheading}
                        </p>
                    )}
                </div>
            </header>

            {/* Block Rendering */}
            <div className="container max-w-7xl mx-auto px-6 space-y-12">
                {portfolio.layoutBlocks?.map((block: any, index: number) => {
                    switch (block.blockType) {
                        case 'grid':
                            return (
                                <section key={index} className={`grid gap-4 md:gap-6 grid-cols-2 md:grid-cols-${block.columns || 3}`}>
                                    {block.items?.map((item: any) => (
                                        <div key={typeof item === 'object' ? item.id : item} className="relative aspect-auto group overflow-hidden bg-zinc-900 rounded-sm">
                                            {typeof item === 'object' && item.url && (
                                                <Image
                                                    src={`${process.env.NEXT_PUBLIC_SERVER_URL}${item.url}`}
                                                    alt={item.alt || ''}
                                                    width={item.width || 800}
                                                    height={item.height || 800}
                                                    className="w-full h-auto object-contain transition-transform duration-700 group-hover:scale-[1.02]"
                                                    unoptimized
                                                />
                                            )}
                                        </div>
                                    ))}
                                </section>
                            )
                        case 'featured':
                            return (
                                <section key={index} className="py-8">
                                    <div className="relative w-full max-w-5xl mx-auto group overflow-hidden bg-zinc-900 rounded-lg shadow-2xl">
                                        {typeof block.media === 'object' && block.media.url && (
                                            <Image
                                                src={`${process.env.NEXT_PUBLIC_SERVER_URL}${block.media.url}`}
                                                alt={block.media.alt || ''}
                                                width={block.media.width || 1200}
                                                height={block.media.height || 800}
                                                className="w-full h-auto object-contain"
                                                unoptimized
                                            />
                                        )}
                                        {block.caption && (
                                            <div className="mt-4 text-center">
                                                <p className="text-sm text-zinc-500 uppercase tracking-widest">{block.caption}</p>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            )
                        case 'spacer':
                            const heights = { small: 'h-12', medium: 'h-24', large: 'h-48' }
                            return (
                                <div key={index} className="flex flex-col items-center justify-center py-4">
                                    <div className={`${heights[block.size as keyof typeof heights] || 'h-24'} w-full`} />
                                    {block.showDivider && <Separator className="bg-zinc-800 max-w-xs" />}
                                </div>
                            )
                        default:
                            return null
                    }
                })}
            </div>

            <footer className="mt-20 text-center text-zinc-600 text-xs uppercase tracking-[0.2em]">
                &copy; {new Date().getFullYear()} Framehouse Hub Portfolio
            </footer>
        </article>
    )
}
