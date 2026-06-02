import { createHmac, randomBytes } from 'crypto'
import type { NextRequest } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import type { PortfolioClientSession } from '@/payload-types'

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
const COOKIE_PREFIX = 'fh_review_'

export function getSessionCookieName(portfolioId: number): string {
  return `${COOKIE_PREFIX}${portfolioId}`
}

export function generateSessionToken(): string {
  return randomBytes(32).toString('hex')
}

/** Sign a session token with HMAC for tamper-proof cookies */
export function signSessionCookie(sessionToken: string, portfolioId: number): string {
  const secret = process.env.PAYLOAD_SECRET || 'fallback-secret'
  const payload = `${sessionToken}:${portfolioId}`
  const hmac = createHmac('sha256', secret).update(payload).digest('hex')
  return Buffer.from(`${sessionToken}:${portfolioId}:${hmac}`).toString('base64url')
}

/** Validate the signed session cookie and extract the session token */
export function validateSessionCookie(
  cookieValue: string,
  portfolioId: number,
): string | null {
  try {
    const decoded = Buffer.from(cookieValue, 'base64url').toString('utf-8')
    const parts = decoded.split(':')
    if (parts.length !== 3) return null
    const [token, pid, hmac] = parts
    if (Number(pid) !== portfolioId) return null
    const secret = process.env.PAYLOAD_SECRET || 'fallback-secret'
    const expected = createHmac('sha256', secret).update(`${token}:${pid}`).digest('hex')
    if (hmac.length !== expected.length) return null
    const isValid = Buffer.from(hmac).every((b, i) => b === Buffer.from(expected)[i])
    return isValid ? token : null
  } catch {
    return null
  }
}

export function maskIp(ip: string | null): string {
  if (!ip) return 'x.x.x.x'
  const parts = ip.split('.')
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.x.x`
  return 'x.x.x.x'
}

export function buildSessionCookie(
  name: string,
  value: string,
  maxAgeSec: number,
): { name: string; value: string; options: Record<string, unknown> } {
  return {
    name,
    value,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: maxAgeSec,
      path: '/',
    },
  }
}

/** Resolve the current client session from the request cookie.
 *  Returns null if no valid session exists. */
export async function resolveSession(
  req: NextRequest,
  portfolioId: number,
): Promise<PortfolioClientSession | null> {
  const cookieValue = req.cookies.get(getSessionCookieName(portfolioId))?.value
  if (!cookieValue) return null

  const sessionToken = validateSessionCookie(cookieValue, portfolioId)
  if (!sessionToken) return null

  try {
    const payload = await getPayload({ config: configPromise })
    const { docs } = await payload.find({
      collection: 'portfolio-client-sessions',
      where: {
        and: [
          { sessionToken: { equals: sessionToken } },
          { portfolio: { equals: portfolioId } },
        ],
      },
      limit: 1,
      overrideAccess: true,
    })
    const session = docs[0]
    if (!session) return null
    // Check TTL
    if (session.expiresAt && new Date(session.expiresAt).getTime() < Date.now()) return null
    return session as PortfolioClientSession
  } catch {
    return null
  }
}

/** Create a new session and return the cookie value to set */
export async function createSession(
  portfolioId: number,
  ip: string | null,
  userAgent: string | null,
): Promise<{ session: PortfolioClientSession; cookieValue: string }> {
  const payload = await getPayload({ config: configPromise })
  const token = generateSessionToken()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)

  const session = await payload.create({
    collection: 'portfolio-client-sessions',
    data: {
      portfolio: portfolioId,
      sessionToken: token,
      isIdentified: false,
      expiresAt: expiresAt.toISOString(),
      ipAddress: maskIp(ip),
      userAgent: (userAgent ?? '').slice(0, 200),
    },
    overrideAccess: true,
  })

  const cookieValue = signSessionCookie(token, portfolioId)
  return { session: session as PortfolioClientSession, cookieValue }
}

/** Extend a session's TTL by 7 days from now */
export async function refreshSession(sessionId: number): Promise<void> {
  const payload = await getPayload({ config: configPromise })
  await payload.update({
    collection: 'portfolio-client-sessions',
    id: sessionId,
    data: { expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString() },
    overrideAccess: true,
  })
}

/** Sanitise comment body — strip HTML, trim whitespace, enforce max length */
export function sanitiseCommentBody(body: string, maxLength = 2000): string {
  return body
    .replace(/<[^>]*>/g, '')  // strip HTML tags
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .trim()
    .slice(0, maxLength)
}

/** Slugify a name for use in a zip filename — alphanumeric + underscore, max 60 chars */
export function slugifyZipName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48)
}
