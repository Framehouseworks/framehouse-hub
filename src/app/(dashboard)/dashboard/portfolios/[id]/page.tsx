import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { fetchPortfolioByIdAction } from '@/app/(dashboard)/actions/portfolios'
import { PortfolioEditorPage } from '@/components/Portfolios/editor/PortfolioEditorPage'
import type { Portfolio } from '@/payload-types'

export const metadata: Metadata = {
  title: 'Edit Portfolio | Framehouse Hub',
}

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ id: string }>
}

export default async function EditPortfolioPage({ params }: Props) {
  const { id } = await params
  const portfolioId = Number(id)

  if (isNaN(portfolioId)) return notFound()

  const result = await fetchPortfolioByIdAction(portfolioId)
  if (!result.success || !result.data) return notFound()

  // Draft portfolios resume in the wizard for a guided editing experience
  const portfolio = result.data as Portfolio & { _status?: string }
  if (portfolio._status === 'draft') {
    redirect(`/dashboard/portfolios/new?resumeId=${portfolioId}`)
  }

  return <PortfolioEditorPage portfolio={result.data} />
}
