// src/collections/Users/hooks/protectRoles.ts
import type { User } from '@/payload-types'
import type { FieldHook } from 'payload'

/**
 * Prevent non-admins from assigning elevated roles.
 * - If the current user is not admin, they can only set ['viewer'].
 * - If admin is creating/updating, ensure 'viewer' is always present.
 */
export const protectRoles: FieldHook<{ id: string } & User> = ({ req, data }) => {
  const isAdmin = !!req.user?.roles?.includes('admin')

  if (!isAdmin) {
    // Force non-admin creators/updaters to only have 'viewer'
    return ['viewer']
  }

  // Admins: ensure 'viewer' role is present (makes downstream access checks simpler)
  const userRoles = new Set(data?.roles || [])
  userRoles.add('viewer')

  return [...userRoles.values()]
}
