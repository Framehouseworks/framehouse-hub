import type { Metadata } from 'next'
import React from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'

export const metadata: Metadata = {
  title: 'Dashboard | Framehouse Hub',
  description: 'Manage your creative visual archive.',
}

export default async function Layout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>
}
