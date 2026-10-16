import type { Metadata } from 'next'
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { checkRole } from '@/access/utilities'
import { TransferWorkbench } from '@/components/Transfers/TransferWorkbench'
import type { Transfer } from '@/payload-types'

export const metadata: Metadata = {
  title: 'Link Transfers | Framehouse Hub',
  description: 'Generate instant, public download links for client deliverables (up to 250MB, 3-day retention).',
}

export const dynamic = 'force-dynamic'

export default async function TransfersDashboardPage() {
  const headersList = await getHeaders()
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: headersList })

  // 1. Sender Authentication: Requires an authenticated active account
  if (!user) {
    redirect('/login?redirect=%2Fdashboard%2Ftransfers')
  }

  // 2. Sender Account Setup & Role Gating:
  // Creative or admin role required for link generation.
  // Viewers/guests cannot generate transfers (redirect to library).
  const isCreative = checkRole(['creative', 'admin'], user)
  if (!isCreative) {
    redirect('/dashboard/library')
  }

  // 3. Hydrate sender's recent transfers from Postgres via Local API
  let initialTransfers: Transfer[] = []
  try {
    const result = await payload.find({
      collection: 'transfers',
      where: { sender: { equals: user.id } },
      sort: '-createdAt',
      limit: 20,
      user,
    })
    initialTransfers = result.docs as Transfer[]
  } catch {
    // Non-fatal: Workbench falls back to empty initial list
  }

  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto space-y-8 animate-pulse">
          <div className="h-20 w-72 rounded-2xl bg-gallery-surface/50" />
          <div className="h-64 rounded-[28px] bg-gallery-surface/50" />
        </div>
      }
    >
      <TransferWorkbench initialTransfers={initialTransfers} />
    </Suspense>
  )
}
