import type { CollectionAfterChangeHook } from 'payload'
import { checkRole } from '@/access/utilities'

const SENSITIVE_FIELDS = ['password', 'visibility'] as const

export const auditAdminChanges: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  req,
  operation,
}) => {
  if (!req.user) return doc
  if (!checkRole(['admin'], req.user)) return doc
  if (operation === 'create') return doc

  const changed = SENSITIVE_FIELDS.filter((f) => doc[f] !== previousDoc?.[f])
  if (changed.length === 0) return doc

  const isPasswordChange = changed.includes('password')
  const actionType = isPasswordChange ? 'portfolio_password_reset' : 'portfolio_visibility_change'

  const description = isPasswordChange
    ? `Admin '${req.user.name ?? req.user.email}' reset password on portfolio '${doc.name}'`
    : `Admin '${req.user.name ?? req.user.email}' changed visibility of portfolio '${doc.name}' to '${doc.visibility}'`

  const ownerId = typeof doc.owner === 'object' ? doc.owner?.id : doc.owner

  await req.payload.create({
    collection: 'admin-activity-logs',
    data: {
      adminUser: req.user.id,
      targetUser: ownerId ?? null,
      targetPortfolio: doc.id,
      actionType,
      actionDescription: description,
      metadata: {
        portfolioId: doc.id,
        changedFields: changed,
        ...(isPasswordChange ? { oldValue: '[REDACTED]', newValue: '[REDACTED]' } : {
          oldVisibility: previousDoc?.visibility ?? null,
          newVisibility: doc.visibility,
        }),
      },
      ipAddress: req.headers?.get?.('x-forwarded-for') ?? req.headers?.get?.('x-real-ip') ?? null,
      userAgent: req.headers?.get?.('user-agent') ?? null,
    },
    overrideAccess: true,
    req,
  })

  return doc
}
