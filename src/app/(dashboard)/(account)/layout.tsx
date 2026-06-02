import type { ReactNode } from 'react'

import { RenderParams } from '@/components/RenderParams'
import { DashboardLayout } from '@/components/layout/DashboardLayout'

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardLayout>
      <RenderParams className="mb-8" />
      {children}
    </DashboardLayout>
  )
}
