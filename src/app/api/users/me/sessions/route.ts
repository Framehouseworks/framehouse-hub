import { NextResponse } from 'next/server'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import type { User } from '@/payload-types'
import type { SessionsResponse } from '@/types/sessions'

// GET — return all active sessions for the authenticated user, with the
// current session identified via the JWT's `sid` claim (user._sid).
export async function GET(): Promise<NextResponse> {
  const headers = await getHeaders()
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers })

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Payload sets _sid on the user object after validating the JWT session claim.
  // Cast needed because _sid is an internal Payload property, not in the public type.
  const currentSessionId = (user as User & { _sid?: string })._sid ?? null

  // Filter out expired sessions before returning — Payload cleans these lazily.
  const now = new Date()
  const activeSessions = (user.sessions ?? []).filter(({ expiresAt }) => {
    return new Date(expiresAt) > now
  })

  const safeTime = (s?: string | null) => {
    if (!s) return 0
    const t = new Date(s).getTime()
    return isNaN(t) ? 0 : t
  }

  // Sort: current session first, then by createdAt descending (most recent first).
  const sorted = [...activeSessions].sort((a, b) => {
    if (a.id === currentSessionId) return -1
    if (b.id === currentSessionId) return 1
    return safeTime(b.createdAt) - safeTime(a.createdAt)
  })

  return NextResponse.json({
    sessions: sorted,
    currentSessionId,
  } satisfies SessionsResponse)
}

// DELETE — revoke sessions for the authenticated user.
//
// Query params:
//   ?keepCurrent=true  → remove all sessions except the current one (Sign out other devices)
//   (no param)         → remove ALL sessions including current (Sign out all devices)
//
// Note: removing all sessions means the user will be logged out everywhere on
// their next page load / JWT refresh, but the current in-flight JWT cookie
// remains valid until its natural expiry. This is the expected Payload behaviour.
export async function DELETE(req: Request): Promise<NextResponse> {
  const headers = await getHeaders()
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers })

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const keepCurrent = url.searchParams.get('keepCurrent') === 'true'
  const currentSessionId = (user as User & { _sid?: string })._sid ?? null

  let updatedSessions: NonNullable<User['sessions']> = []

  if (keepCurrent && currentSessionId) {
    // Keep only the current session — sign out all other devices.
    updatedSessions = (user.sessions ?? []).filter((s) => s.id === currentSessionId)
  }
  // else: updatedSessions stays [] — sign out all devices.

  await payload.update({
    collection: 'users',
    id: user.id,
    data: { sessions: updatedSessions },
  })

  return NextResponse.json({
    success: true,
    revokedCount: (user.sessions?.length ?? 0) - updatedSessions.length,
    keptCurrent: keepCurrent && currentSessionId !== null,
  })
}
