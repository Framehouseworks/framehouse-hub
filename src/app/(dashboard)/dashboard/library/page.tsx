import { Suspense } from 'react'
import Link from 'next/link'
import { cn } from '@/utilities/cn'
import { Gallery } from '@/components/Gallery'
import { SmartCollectionsView } from '@/components/SmartCollections/SmartCollectionsView'

export const dynamic = 'force-dynamic'

type Tab = 'assets' | 'collections' | 'batches'

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const activeTab: Tab = (params.tab as Tab) || 'assets'

  const tabs: { id: Tab; label: string }[] = [
    { id: 'assets', label: 'All Assets' },
    { id: 'collections', label: 'Collections' },
    { id: 'batches', label: 'Batches' },
  ]

  return (
    <div className="flex flex-col min-h-[calc(100vh-180px)]">
      <header className="mb-8 flex flex-col gap-3 flex-shrink-0">
        <div className="inline-block bg-gallery-gold/10 text-gallery-gold font-rubik text-[9px] tracking-[0.25em] px-2 py-0.5 rounded-sm uppercase w-fit">
          LIBRARY
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-primary lg:text-4xl">
          Source of Truth
        </h1>
      </header>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-8 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-1 flex-shrink-0">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={`/dashboard/library?tab=${tab.id}`}
            className={cn(
              'snap-start flex-shrink-0 px-5 py-2 rounded-full text-sm font-medium transition-all duration-200',
              activeTab === tab.id
                ? 'bg-gallery-gold/10 text-gallery-gold font-semibold'
                : 'text-[#1a1c1c]/40 hover:text-[#1a1c1c] hover:bg-[#f3f3f4]',
            )}
          >
            {tab.label}
            {tab.id === 'collections' && activeTab !== 'collections' && (
              <span className="ml-1.5 font-rubik text-[9px] text-gallery-gold">✦</span>
            )}
          </Link>
        ))}
        {/* Gold underline for active tab */}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {tabs.find((t) => t.id === activeTab)?.label} tab active
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 flex flex-col">
        {activeTab === 'assets' && (
          <Suspense
            fallback={
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-[16px] bg-[#f3f3f4] animate-pulse"
                  />
                ))}
              </div>
            }
          >
            <Gallery searchParams={params} />
          </Suspense>
        )}

        {activeTab === 'collections' && (
          <Suspense
            fallback={
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="aspect-[4/5] rounded-[24px] bg-[#f3f3f4] animate-pulse"
                  />
                ))}
              </div>
            }
          >
            <SmartCollectionsView />
          </Suspense>
        )}

        {activeTab === 'batches' && (
          <div className="flex items-center justify-center py-24">
            <p className="text-sm text-[#1a1c1c]/30 italic">Batch history coming soon.</p>
          </div>
        )}
      </div>
    </div>
  )
}
