import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import {
  resolveSession,
  createSession,
  refreshSession,
  getSessionCookieName,
  buildSessionCookie,
  signSessionCookie,
} from '@/lib/review-session'
import type { Portfolio } from '@/payload-types'

type Params = { params: Promise<{ slug: string }> }

/** POST /api/portfolio-review/[slug]/session
 *  Creates or refreshes a client review session for the given portfolio.
 *  Returns { sessionToken (sanitised), expiresAt, clientName?, clientEmail? } */
export async function POST(req: NextRequest, { params }: Params) {
  const { slug } = await params
  const payload = await getPayload({ config: configPromise })

  const { docs } = await payload.find({
    collection: 'portfolios',
    where: {
      and: [
        { slug: { equals: slug } },
        { visibility: { in: ['public', 'shared'] } },
      ],
    },
    depth: 0,
    limit: 1,
  })

  const portfolio = docs[0] as Portfolio | undefined
  if (!portfolio) {
    return NextResponse.json({ error: 'PORTFOLIO_NOT_FOUND' }, { status: 404 })
  }

  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? null
  const userAgent = req.headers.get('user-agent') ?? null

  // Try to reuse existing valid session
  const existing = await resolveSession(req, portfolio.id)

  if (existing) {
    await refreshSession(existing.id)
    const cookieName = getSessionCookieName(portfolio.id)
    const cookieValue = signSessionCookie(existing.sessionToken as string, portfolio.id)
    const cookie = buildSessionCookie(cookieName, cookieValue, 7 * 24 * 60 * 60)

    const res = NextResponse.json({
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      clientName: existing.clientName ?? null,
      clientEmail: existing.clientEmail ?? null,
      isIdentified: existing.isIdentified ?? false,
      savedSelectionIds: existing.savedSelectionIds ?? [],
    })
    res.cookies.set(cookie.name, cookie.value, cookie.options as Parameters<typeof res.cookies.set>[2])
    return res
  }

  const { session, cookieValue } = await createSession(portfolio.id, ip, userAgent)
  const cookieName = getSessionCookieName(portfolio.id)
  const cookie = buildSessionCookie(cookieName, cookieValue, 7 * 24 * 60 * 60)

  const res = NextResponse.json({
    expiresAt: session.expiresAt,
    clientName: null,
    clientEmail: null,
    isIdentified: false,
    savedSelectionIds: [],
  })
  res.cookies.set(cookie.name, cookie.value, cookie.options as Parameters<typeof res.cookies.set>[2])
  return res
}
