import { Suspense } from 'react'
import { Gallery } from '@/components/Gallery'
import { LibraryPageHeader } from '@/components/layout/LibraryPageHeader'

export const dynamic = 'force-dynamic'

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams

  return (
    <div className="flex flex-col min-h-[calc(100vh-180px)]">
      <LibraryPageHeader
        title="All Media"
        description="Your complete visual archive."
      />

      <Suspense
        fallback={
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
              <div className="h-9 w-64 rounded-2xl bg-gallery-surface/50 animate-pulse" />
              <div className="flex gap-2">
                <div className="h-9 w-24 rounded-xl bg-gallery-surface/50 animate-pulse" />
                <div className="h-9 w-20 rounded-xl bg-gallery-surface/50 animate-pulse" />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-[16px] bg-gallery-surface/50 animate-pulse" />
              ))}
            </div>
          </div>
        }
      >
        <Gallery searchParams={params} />
      </Suspense>
    </div>
  )
}
