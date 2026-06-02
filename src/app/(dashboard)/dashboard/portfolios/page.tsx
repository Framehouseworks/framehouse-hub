import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { PortfolioListPage } from '@/components/Portfolios/PortfolioListPage'
import type { Portfolio } from '@/payload-types'

export const metadata: Metadata = {
  title: 'Portfolios | Framehouse Hub',
  description: 'Create and manage your client portfolios.',
}

export const dynamic = 'force-dynamic'

export default async function PortfoliosPage() {
  // Fetch server-side so revalidatePath() after publish always delivers fresh
  // _status data, bypassing the client-side router cache that otherwise restores
  // stale React component state and keeps published portfolios showing as draft.
  let initialPortfolios: Portfolio[] = []

  try {
    const headersList = await getHeaders()
    const payload = await getPayload({ config: configPromise })
    const { user } = await payload.auth({ headers: headersList })

    if (user) {
      const result = await payload.find({
        collection: 'portfolios',
        where: { owner: { equals: user.id } },
        sort: '-updatedAt',
        limit: 100,
        depth: 1,
        draft: true,
        user,
      })
      initialPortfolios = result.docs as Portfolio[]
    }
  } catch {
    // Fall back to client-side fetch inside PortfolioListPage
  }

  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="h-24 rounded-2xl bg-gallery-surface/50 animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 rounded-2xl bg-gallery-surface/50 animate-pulse" />
            ))}
          </div>
        </div>
      }
    >
      <PortfolioListPage initialPortfolios={initialPortfolios} />
    </Suspense>
  )
}
