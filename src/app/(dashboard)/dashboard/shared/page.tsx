import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { SharedPage } from '@/components/Shared/SharedPage'
import type { Portfolio } from '@/payload-types'

export const metadata: Metadata = {
  title: 'Shared Work | Framehouse Hub',
  description: 'Portfolios shared with clients or published publicly.',
}

export const dynamic = 'force-dynamic'

export default async function SharedDashboardPage() {
  let initialPortfolios: Portfolio[] = []

  try {
    const headersList = await getHeaders()
    const payload = await getPayload({ config: configPromise })
    const { user } = await payload.auth({ headers: headersList })

    if (user) {
      const result = await payload.find({
        collection: 'portfolios',
        where: {
          and: [
            { owner: { equals: user.id } },
            {
              or: [
                { visibility: { equals: 'shared' } },
                { visibility: { equals: 'public' } },
              ],
            },
          ],
        },
        sort: '-updatedAt',
        limit: 100,
        depth: 1,
        draft: false,
        user,
      })
      initialPortfolios = result.docs as Portfolio[]
    }
  } catch {
    // Fall back to empty — client-side has no refetch here; shared items are typically
    // published docs so draft:false is correct. If SSR fails the page renders the empty state.
  }

  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="h-16 rounded-2xl bg-gallery-surface/50 animate-pulse" />
          <div className="h-10 w-48 rounded-[20px] bg-gallery-surface/50 animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-56 rounded-[20px] bg-gallery-surface/50 animate-pulse" />
            ))}
          </div>
        </div>
      }
    >
      <SharedPage initialPortfolios={initialPortfolios} />
    </Suspense>
  )
}
