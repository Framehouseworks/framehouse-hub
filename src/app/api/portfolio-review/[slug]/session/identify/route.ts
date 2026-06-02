import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { resolveSession } from '@/lib/review-session'

type Params = { params: Promise<{ slug: string }> }

/** PATCH /api/portfolio-review/[slug]/session/identify
 *  Attaches client name + optional email to the session. */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { slug } = await params
  const payload = await getPayload({ config: configPromise })

  const { docs } = await payload.find({
    collection: 'portfolios',
    where: { slug: { equals: slug } },
    depth: 0,
    limit: 1,
  })

  const portfolio = docs[0]
  if (!portfolio) {
    return NextResponse.json({ error: 'PORTFOLIO_NOT_FOUND' }, { status: 404 })
  }

  const session = await resolveSession(req, portfolio.id)
  if (!session) {
    return NextResponse.json({ error: 'SESSION_NOT_FOUND' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const clientName = typeof body?.clientName === 'string' ? body.clientName.trim() : ''
  const clientEmail = typeof body?.clientEmail === 'string' ? body.clientEmail.trim() : ''

  if (!clientName) {
    return NextResponse.json({ error: 'NAME_REQUIRED' }, { status: 400 })
  }

  // RFC 5322 simplified email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (clientEmail && !emailRegex.test(clientEmail)) {
    return NextResponse.json({ error: 'INVALID_EMAIL' }, { status: 400 })
  }

  await payload.update({
    collection: 'portfolio-client-sessions',
    id: session.id,
    data: {
      clientName,
      clientEmail: clientEmail || null,
      isIdentified: true,
    },
    overrideAccess: true,
  })

  return NextResponse.json({ ok: true, clientName, clientEmail: clientEmail || null })
}
