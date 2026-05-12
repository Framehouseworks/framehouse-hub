import type { ReactNode } from 'react'

import { headers as getHeaders } from 'next/headers'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { RenderParams } from '@/components/RenderParams'
import { AccountNav } from '@/components/AccountNav'
import { DashboardLayout } from '@/components/layout/DashboardLayout'

export default async function RootLayout({ children }: { children: ReactNode }) {
  const headers = await getHeaders()
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers })

  return (
    <DashboardLayout>
      <RenderParams className="mb-8" />
      <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
        {user && (
          <AccountNav className="max-w-[15.5rem] grow flex-col items-start gap-4 hidden md:flex" />
        )}

        <div className="flex flex-col gap-12 grow">{children}</div>
      </div>
    </DashboardLayout>
  )
}
