import { Suspense } from 'react'
import { SmartCollectionsView } from '@/components/SmartCollections/SmartCollectionsView'

export const dynamic = 'force-dynamic'

export default async function CollectionsPage() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-180px)]">
      <header className="mb-10 flex flex-col gap-3 flex-shrink-0">
        <div className="inline-block bg-gallery-gold/10 text-gallery-gold font-rubik text-[9px] tracking-[0.25em] px-2 py-0.5 rounded-sm uppercase w-fit">
          LIBRARY
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-primary lg:text-4xl">
          Collections
        </h1>
        <p className="text-base text-on-surface/40 max-w-xl leading-relaxed">
          Smart and curated groups of your archived media.
        </p>
      </header>

      <Suspense
        fallback={
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="aspect-[4/5] rounded-[24px] bg-gallery-surface/50 animate-pulse"
              />
            ))}
          </div>
        }
      >
        <SmartCollectionsView />
      </Suspense>
    </div>
  )
}
