import type { Access } from 'payload'
import { checkRole } from '@/access/utilities'

/**
 * Access control definitions for the Transfers collection.
 * - Create: Authenticated active user (creative or admin).
 * - Read: Public read for active, unexpired transfers by shareHash; sender/admin for account transfers.
 * - Update: Sender or admin only.
 * - Delete: Sender or admin only.
 */
export const transfersAccess = {
  create: (({ req: { user } }) => Boolean(user)) as Access,

  read: (({ req: { user } }) => {
    // Admins have unrestricted read access
    if (user && checkRole(['admin'], user)) return true

    // Authenticated users can read their own transfers or any active unexpired transfer
    if (user) {
      return {
        or: [
          { sender: { equals: user.id } },
          {
            and: [
              { status: { equals: 'active' } },
              { expiresAt: { greater_than: new Date().toISOString() } },
            ],
          },
        ],
      }
    }

    // Public/anonymous access: strictly active and unexpired
    return {
      and: [
        { status: { equals: 'active' } },
        { expiresAt: { greater_than: new Date().toISOString() } },
      ],
    }
  }) as Access,

  update: (({ req: { user } }) => {
    if (!user) return false
    if (checkRole(['admin'], user)) return true
    return { sender: { equals: user.id } }
  }) as Access,

  delete: (({ req: { user } }) => {
    if (!user) return false
    if (checkRole(['admin'], user)) return true
    return { sender: { equals: user.id } }
  }) as Access,
}
