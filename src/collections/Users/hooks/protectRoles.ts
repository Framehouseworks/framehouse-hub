// src/collections/Users/hooks/protectRoles.ts
import type { User } from '@/payload-types'
import type { FieldHook } from 'payload'

/**
 * Prevent non-admins from assigning elevated roles.
 * - If the current user is not admin, they can only set ['viewer'].
 * - If admin is creating/updating, ensure 'viewer' is always present.
 * - If no user is logged in (first user creation), trust the incoming 'data.roles'
 * as it was set by 'ensureFirstUserIsAdmin'.
 */
export const protectRoles: FieldHook<{ id: string } & User> = ({ req, data }) => {
  // If there is no user on the request, we are either creating the
  // first user (handled by `ensureFirstUserIsAdmin`) or it's a
  // public registration.
  if (!req.user) {
    // If 'data.roles' exists, it means 'ensureFirstUserIsAdmin' just ran
    // and added the 'admin' role. We must return this value.
    if (data?.roles) {
      return data.roles
    }
    // Otherwise, it's a standard public registration, default to 'viewer'.
    return ['viewer']
  }

  // If a user *is* logged in, check if they are an admin
  const isAdmin = !!req.user.roles?.includes('admin')

  // If the logged-in user is NOT an admin, they can only
  // create/update other users to have the 'viewer' role.
  if (!isAdmin) {
    return ['viewer']
  }

  // If the logged-in user IS an admin, allow them to set any roles,
  // but always ensure 'viewer' is present for consistency.
  const userRoles = new Set(data?.roles || [])
  userRoles.add('viewer')

  return [...userRoles.values()]
}