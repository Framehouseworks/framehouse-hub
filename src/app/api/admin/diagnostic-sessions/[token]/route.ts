import { createHash } from 'crypto'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { checkRole } from '@/access/utilities'

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: req.headers })

  if (!user || !checkRole(['admin'], user)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!token || typeof token !== 'string') {
    return Response.json({ error: 'Invalid token' }, { status: 400 })
  }

  const tokenHash = createHash('sha256').update(token).digest('hex')

  const result = await payload.find({
    collection: 'admin-diagnostic-sessions',
    where: {
      and: [
        { tokenHash: { equals: tokenHash } },
        { isActive: { equals: true } },
      ],
    },
    limit: 1,
    overrideAccess: true,
  })

  const session = result.docs[0]
  if (!session) {
    return Response.json({ error: 'Session not found or already terminated' }, { status: 404 })
  }

  const sessionAdminId = typeof session.admin === 'object' ? session.admin?.id : session.admin
  if (String(sessionAdminId) !== String(user.id)) {
    return Response.json({ error: 'You can only terminate your own diagnostic sessions' }, { status: 403 })
  }

  const now = new Date().toISOString()

  await payload.update({
    collection: 'admin-diagnostic-sessions',
    id: session.id,
    data: {
      isActive: false,
      terminatedAt: now,
      terminatedBy: user.id,
    },
    overrideAccess: true,
  })

  const targetUserId =
    typeof session.targetCreative === 'object' ? session.targetCreative?.id : session.targetCreative

  await payload.create({
    collection: 'admin-activity-logs',
    data: {
      adminUser: user.id,
      targetUser: targetUserId ?? null,
      actionType: 'terminate_diagnostic',
      actionDescription: `Admin '${user.name ?? user.email}' manually terminated diagnostic session`,
      metadata: { diagnosticSessionId: session.id },
      diagnosticSession: session.id,
      ipAddress: req.headers.get('x-forwarded-for') ?? null,
      userAgent: req.headers.get('user-agent') ?? null,
    },
    overrideAccess: true,
  })

  return Response.json({ success: true })
}
