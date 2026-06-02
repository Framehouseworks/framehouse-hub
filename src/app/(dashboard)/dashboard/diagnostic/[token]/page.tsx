import React from 'react'
import { createHash } from 'crypto'
import { notFound } from 'next/navigation'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { checkRole } from '@/access/utilities'
import { DiagnosticBanner } from '@/components/DiagnosticBanner'
import { DiagnosticModeProvider } from '@/components/DiagnosticBanner/DiagnosticModeProvider'
import { DiagnosticMirrorContent } from '@/components/DiagnosticBanner/DiagnosticMirrorContent'
import type { Portfolio, User, AdminDiagnosticSession } from '@/payload-types'

export const dynamic = 'force-dynamic'

export default async function DiagnosticPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const headersList = await getHeaders()
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: headersList })

  if (!user || !checkRole(['admin'], user)) {
    notFound()
  }

  if (!token || typeof token !== 'string' || token.length < 32) {
    notFound()
  }

  const tokenHash = createHash('sha256').update(token).digest('hex')

  const sessionResult = await payload.find({
    collection: 'admin-diagnostic-sessions',
    where: {
      and: [
        { tokenHash: { equals: tokenHash } },
        { isActive: { equals: true } },
      ],
    },
    limit: 1,
    depth: 1,
    overrideAccess: true,
  })

  const session = sessionResult.docs[0] as AdminDiagnosticSession | undefined
  if (!session) notFound()

  // Check TTL
  if (new Date(session.expiresAt) <= new Date()) {
    await payload.update({
      collection: 'admin-diagnostic-sessions',
      id: session.id,
      data: { isActive: false },
      overrideAccess: true,
    })
    await payload.create({
      collection: 'admin-activity-logs',
      data: {
        adminUser: user.id,
        targetUser:
          typeof session.targetCreative === 'object' ? session.targetCreative?.id : session.targetCreative,
        actionType: 'diagnostic_expired',
        actionDescription: `Diagnostic session expired for admin '${user.name ?? user.email}'`,
        metadata: { diagnosticSessionId: session.id },
        diagnosticSession: session.id,
      },
      overrideAccess: true,
    })
    notFound()
  }

  // Security: ensure the authenticated admin owns this session
  const sessionAdminId =
    typeof session.admin === 'object' ? session.admin?.id : session.admin
  if (String(sessionAdminId) !== String(user.id)) {
    notFound()
  }

  const targetCreative = session.targetCreative as User
  const targetId = typeof targetCreative === 'object' ? targetCreative.id : targetCreative

  // Fetch creative's portfolios
  const portfolioResult = await payload.find({
    collection: 'portfolios',
    where: { owner: { equals: targetId } },
    sort: '-updatedAt',
    limit: 50,
    depth: 1,
    overrideAccess: true,
  })

  // Fetch creative's recent media
  const mediaResult = await payload.find({
    collection: 'media',
    where: { owner: { equals: targetId } },
    sort: '-createdAt',
    limit: 24,
    depth: 0,
    overrideAccess: true,
  })

  // Log inspect event (once per route load, not per navigation)
  await payload.create({
    collection: 'admin-activity-logs',
    data: {
      adminUser: user.id,
      targetUser: targetId,
      actionType: 'inspect_account',
      actionDescription: `Admin '${user.name ?? user.email}' viewed diagnostic mirror for creative '${typeof targetCreative === 'object' ? (targetCreative.name ?? targetCreative.email) : targetId}'`,
      metadata: { diagnosticSessionId: session.id },
      diagnosticSession: session.id,
      ipAddress: headersList.get('x-forwarded-for') ?? null,
      userAgent: headersList.get('user-agent') ?? null,
    },
    overrideAccess: true,
  })

  const creativeName = typeof targetCreative === 'object' ? (targetCreative.name ?? null) : null
  const creativeEmail =
    typeof targetCreative === 'object' ? targetCreative.email : String(targetId)

  return (
    <DiagnosticModeProvider
      targetCreativeName={creativeName}
      targetCreativeEmail={creativeEmail}
      expiresAt={session.expiresAt}
      sessionToken={token}
    >
      <div className="min-h-screen bg-background">
        <DiagnosticBanner
          targetCreativeName={creativeName}
          targetCreativeEmail={creativeEmail}
          expiresAt={session.expiresAt}
          sessionToken={token}
          adminReturnUrl={`/admin/collections/users/${targetId}`}
        />
        <DiagnosticMirrorContent
          targetCreative={targetCreative as User}
          portfolios={portfolioResult.docs as Portfolio[]}
          totalPortfolios={portfolioResult.totalDocs}
          recentMedia={mediaResult.docs}
          totalMedia={mediaResult.totalDocs}
          adminId={String(user.id)}
        />
      </div>
    </DiagnosticModeProvider>
  )
}
