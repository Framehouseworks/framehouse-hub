import { createHash, randomBytes } from 'crypto'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { checkRole } from '@/access/utilities'

const TTL_MINUTES = 15

export async function POST(req: Request) {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: req.headers })

  if (!user || !checkRole(['admin'], user)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { targetUserId?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { targetUserId } = body
  if (!targetUserId || typeof targetUserId !== 'string') {
    return Response.json({ error: 'targetUserId is required' }, { status: 400 })
  }

  if (String(targetUserId) === String(user.id)) {
    return Response.json({ error: 'Cannot create a diagnostic session for your own account' }, { status: 422 })
  }

  let target
  try {
    target = await payload.findByID({
      collection: 'users',
      id: targetUserId,
      overrideAccess: true,
    })
  } catch {
    return Response.json({ error: 'Target user not found' }, { status: 404 })
  }

  if (!checkRole(['creative'], target)) {
    return Response.json(
      { error: 'Diagnostic sessions can only be created for Creative accounts' },
      { status: 422 },
    )
  }

  const rawToken = randomBytes(32).toString('hex')
  const tokenHash = createHash('sha256').update(rawToken).digest('hex')
  const expiresAt = new Date(Date.now() + TTL_MINUTES * 60 * 1000)

  const ipAddress =
    req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? null
  const userAgent = req.headers.get('user-agent') ?? null

  // Payload relationship fields expect number IDs when using the Postgres adapter
  const targetIdNum = Number(targetUserId)

  const session = await payload.create({
    collection: 'admin-diagnostic-sessions',
    data: {
      admin: user.id,
      targetCreative: targetIdNum,
      tokenHash,
      expiresAt: expiresAt.toISOString(),
      isActive: true,
      ipAddress,
      userAgent,
    },
    overrideAccess: true,
  })

  await payload.create({
    collection: 'admin-activity-logs',
    data: {
      adminUser: user.id,
      targetUser: targetIdNum,
      actionType: 'launch_diagnostic',
      actionDescription: `Admin '${user.name ?? user.email}' launched a diagnostic session for creative '${target.name ?? target.email}'`,
      metadata: {
        diagnosticSessionId: session.id,
        ttlMinutes: TTL_MINUTES,
        targetEmail: target.email,
      },
      diagnosticSession: session.id,
      ipAddress,
      userAgent,
    },
    overrideAccess: true,
  })

  return Response.json({
    token: rawToken,
    sessionId: session.id,
    expiresAt: expiresAt.toISOString(),
    targetCreative: {
      id: target.id,
      name: target.name ?? null,
      email: target.email,
    },
  })
}
