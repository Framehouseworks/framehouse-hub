import type { User } from '@/payload-types'
import type { FieldHook } from 'payload'

/**
 * Prevent non-admins from assigning elevated roles.
 *
 * Responsibility split:
 *   - Field-level `access.update: adminOnlyFieldAccess` already strips `roles`
 *     from any PATCH submitted by a non-admin, so the incoming `value` passed
 *     to this hook is already the EXISTING document value when a creative/viewer
 *     saves their own profile.
 *   - This hook's job is therefore:
 *       CREATE  → default new public registrations to ['viewer'].
 *       UPDATE  → non-admins preserve their existing roles (no-op); admins may
 *                 set any roles and always get 'viewer' appended.
 *
 * Without the operation check, the hook previously returned ['viewer'] on every
 * non-admin update regardless of whether roles were being changed — silently
 * downgrading creative/admin users on every profile save.
 */
export const protectRoles: FieldHook<{ id: string } & User> = ({
  req,
  data,
  value,
  operation,
}) => {
  // No authenticated user → public registration or first-user bootstrap.
  if (!req.user) {
    // `ensureFirstUserIsAdmin` may have already stamped 'admin' onto data.roles.
    if (data?.roles) return data.roles
    return ['viewer']
  }

  const isAdmin = !!req.user.roles?.includes('admin')

  if (!isAdmin) {
    if (operation === 'create') {
      // New registrations by non-admins default to viewer only.
      return ['viewer']
    }
    // UPDATE — field access already stripped any incoming role change.
    // Return the existing value unchanged so we never silently downgrade.
    return value
  }

  // Admin — allow any roles; always ensure 'viewer' is present.
  const userRoles = new Set(data?.roles ?? value ?? [])
  userRoles.add('viewer')
  return [...userRoles.values()]
}
