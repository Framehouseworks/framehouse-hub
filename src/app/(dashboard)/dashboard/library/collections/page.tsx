import { Suspense } from 'react'
import { SmartCollectionsView } from '@/components/SmartCollections/SmartCollectionsView'
import { LibraryPageHeader } from '@/components/layout/LibraryPageHeader'

export const dynamic = 'force-dynamic'

export default async function CollectionsPage() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-180px)]">
      <LibraryPageHeader
        title="Collections"
        description="Curate and organise your work — by hand or by rule."
      />

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
