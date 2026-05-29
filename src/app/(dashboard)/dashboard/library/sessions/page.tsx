import { Suspense } from 'react'
import { SessionsView } from '@/components/Sessions/SessionsView'
import { LibraryPageHeader } from '@/components/layout/LibraryPageHeader'

export const dynamic = 'force-dynamic'

export default function SessionsPage() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-180px)]">
      <LibraryPageHeader
        title="Sessions"
        description="Your production archive — every project, location and date, in chronological order."
      />

      <Suspense
        fallback={
          <div className="flex flex-col gap-2.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-[96px] rounded-[20px] bg-gallery-surface/50 animate-pulse" />
            ))}
          </div>
        }
      >
        <SessionsView />
      </Suspense>
    </div>
  )
}
