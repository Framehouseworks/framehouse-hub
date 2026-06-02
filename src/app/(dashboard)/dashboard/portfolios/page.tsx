import type { Metadata } from 'next'
import { Suspense } from 'react'
import { PortfolioListPage } from '@/components/Portfolios/PortfolioListPage'

export const metadata: Metadata = {
  title: 'Portfolios | Framehouse Hub',
  description: 'Create and manage your client portfolios.',
}

export const dynamic = 'force-dynamic'

export default function PortfoliosPage() {
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
      <PortfolioListPage />
    </Suspense>
  )
}
