import type { Metadata } from 'next'
import { PortfolioWizardPage } from '@/components/Portfolios/wizard/PortfolioWizardPage'

export const metadata: Metadata = {
  title: 'New Portfolio | Framehouse Hub',
}

export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Promise<{ assets?: string }>
}

export default async function NewPortfolioPage({ searchParams }: Props) {
  const params = await searchParams
  const preloadedAssetIds = params.assets
    ? params.assets.split(',').map(Number).filter(Boolean)
    : []

  return <PortfolioWizardPage preloadedAssetIds={preloadedAssetIds} />
}
