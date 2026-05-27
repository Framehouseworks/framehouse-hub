import { Suspense } from 'react'
import { Gallery } from '@/components/Gallery'

export const dynamic = 'force-dynamic'

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams

  return (
    <div className="flex flex-col min-h-[calc(100vh-180px)]">
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 flex-shrink-0">
        <div className="space-y-3">
          <div className="inline-block bg-gallery-gold/10 text-gallery-gold font-rubik text-[9px] tracking-[0.25em] px-2 py-0.5 rounded-sm uppercase">
            LIBRARY
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-primary lg:text-4xl">
            All Media
          </h1>
          <p className="text-base text-on-surface/40 max-w-xl leading-relaxed">
            Your complete visual archive.
          </p>
        </div>
      </header>

      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between pb-2 mb-8 flex-shrink-0">
          <h2 className="font-rubik text-xs tracking-[0.2em] text-primary uppercase">
            All Assets
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
          <Gallery searchParams={params} />
        </Suspense>
      </div>
    </div>
  )
}
