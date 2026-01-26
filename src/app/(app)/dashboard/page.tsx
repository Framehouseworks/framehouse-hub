import { CollectionExplorer } from '@/components/CollectionExplorer'
import { Gallery } from '@/components/Gallery'
import { Badge } from '@/components/ui/badge'
import { Suspense } from 'react'

export default async function DashboardPage() {
    return (
        <div className="container max-w-7xl mx-auto py-12 px-4">
            <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5 px-3 py-1 uppercase tracking-wider">
                        Client Portal
                    </Badge>
                    <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl bg-gradient-to-br from-white to-zinc-500 bg-clip-text text-transparent">
                        Your Media Hub
                    </h1>
                    <p className="text-lg text-zinc-400 max-w-2xl">
                        Access and manage your high-resolution assets in one centralized space.
                    </p>
                </div>
            </header>

            <section className="space-y-8">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                    <h2 className="text-xl font-semibold text-zinc-100 italic">Recent Uploads</h2>
                </div>

                <Suspense fallback={
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="aspect-square rounded-xl bg-zinc-900/50 animate-pulse" />
                        ))}
                    </div>
                }>
                    <Gallery />
                </Suspense>
            </section>

            <Suspense fallback={<div className="mt-16 h-32 bg-zinc-900/50 animate-pulse rounded-xl" />}>
                <CollectionExplorer />
            </Suspense>
        </div>
    )
}
