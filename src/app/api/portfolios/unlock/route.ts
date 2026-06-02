import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { createHmac } from 'crypto'

// POST /api/portfolios/unlock — verifies portfolio password, sets an unlock cookie
export async function POST(req: NextRequest) {
  const { slug, password } = await req.json()

  if (!slug || !password) {
    return NextResponse.json({ error: 'Missing slug or password' }, { status: 400 })
  }

  const payload = await getPayload({ config: configPromise })

  const { docs } = await payload.find({
    collection: 'portfolios',
    where: { and: [{ slug: { equals: slug } }, { visibility: { equals: 'shared' } }] },
    limit: 1,
    depth: 0,
  })

  const portfolio = docs[0]
  if (!portfolio || !portfolio.password) {
    return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 })
  }

  // Constant-time character-by-character comparison to prevent timing attacks
  const expected = Buffer.from(portfolio.password)
  const provided = Buffer.from(password)
  let match = expected.length === provided.length
  if (match) {
    match = expected.every((b, i) => b === provided[i])
  }

  if (!match) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
  }

  // Issue an unlock token — HMAC-signed, 24h TTL
  const secret = process.env.PAYLOAD_SECRET || 'fallback-secret'
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000
  const tokenPayload = `${portfolio.id}:${expiresAt}`
  const hmac = createHmac('sha256', secret).update(tokenPayload).digest('hex')
  const token = Buffer.from(`${tokenPayload}:${hmac}`).toString('base64url')

  const res = NextResponse.json({ ok: true })
  res.cookies.set(`portfolio_unlock_${portfolio.id}`, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60, // 24 hours
    path: '/',
  })
  return res
}
