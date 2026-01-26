import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { auth } from '@/utilities/auth'
import configPromise from '@payload-config'
import Link from 'next/link'
import { getPayload } from 'payload'

export const CollectionExplorer = async () => {
    const user = await auth()
    if (!user) return null

    const payload = await getPayload({ config: configPromise })
    const { docs: portfolios } = await payload.find({
        collection: 'portfolios',
        where: {
            owner: {
                equals: user.id
            }
        },
        sort: '-updatedAt'
    })

    if (portfolios.length === 0) return null

    return (
        <section className="mt-16 space-y-8">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <h2 className="text-xl font-semibold text-zinc-100 italic">Your Portfolios</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {portfolios.map((portfolio) => (
                    <Link key={portfolio.id} href={`/p/${portfolio.slug}`} target="_blank">
                        <Card className="bg-zinc-900/40 border-zinc-800 hover:bg-zinc-800/50 transition-colors group">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-lg font-medium group-hover:text-primary transition-colors">
                                    {portfolio.title}
                                </CardTitle>
                                <Badge variant="secondary" className="opacity-70 capitalize">
                                    {portfolio.visibility}
                                </Badge>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-zinc-400 line-clamp-2">
                                    {portfolio.subheading || 'No subheading provided.'}
                                </p>
                                <div className="mt-4 text-primary text-xs font-semibold flex items-center gap-2">
                                    View Public Page <span className="text-lg">→</span>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </section>
    )
}
