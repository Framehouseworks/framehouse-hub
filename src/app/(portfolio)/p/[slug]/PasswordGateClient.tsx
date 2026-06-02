'use client'

import type { ThemeConfig } from '@/components/Portfolio/PortfolioThemeProvider'
import { PasswordGate } from '@/components/Portfolio/PasswordGate'
import { useRouter } from 'next/navigation'

interface Props {
  slug: string
  portfolioName?: string
  theme?: ThemeConfig
}

export function PasswordGateClient({ slug, portfolioName, theme }: Props) {
  const router = useRouter()

  async function handleUnlock(password: string): Promise<boolean> {
    const res = await fetch('/api/portfolios/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, password }),
    })
    if (res.ok) {
      router.refresh()
      return true
    }
    return false
  }

  return (
    <PasswordGate
      slug={slug}
      onUnlock={handleUnlock}
      portfolioName={portfolioName}
      theme={theme}
    />
  )
}
