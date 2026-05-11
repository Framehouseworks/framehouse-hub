import { CollectionExplorer } from '@/components/CollectionExplorer'
import { Gallery } from '@/components/Gallery'
import { Badge } from '@/components/ui/badge'
import { Suspense } from 'react'

export default async function DashboardPage() {
  return (
    <>
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <div className="inline-block bg-gallery-gold/10 text-gallery-gold font-rubik text-[10px] tracking-[0.2em] px-3 py-1 rounded-full uppercase">
            Creative Archive
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-primary lg:text-5xl">
            The Living Index
          </h1>
          <p className="text-lg text-on-surface/50 max-w-2xl leading-relaxed">
            Your centralized stage for high-resolution creative work and visual metadata.
          </p>
        </div>
      </header>

      <section className="space-y-8">
        <div className="flex items-center justify-between pb-2">
          <h2 className="font-rubik text-xs tracking-[0.2em] text-primary uppercase">
            Recent Uploads
          </h2>
        </div>

        <Suspense
          fallback={
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="aspect-square rounded-[16px] bg-gallery-surface/50 animate-pulse"
                />
              ))}
            </div>
          }
        >
          <Gallery />
        </Suspense>
      </section>

      <Suspense
        fallback={<div className="mt-16 h-32 bg-gallery-surface/50 animate-pulse rounded-[16px]" />}
      >
        <CollectionExplorer />
      </Suspense>
    </>
  )
}
