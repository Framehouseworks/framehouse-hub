import type { Access } from 'payload'
import { checkRole } from '@/access/utilities'

/**
 * Access control definitions for the TransferWallpapers collection.
 * - Create / Update / Delete: Admin only.
 * - Read: Admins have full access. Public / anonymous users can read active wallpapers within scheduled date window.
 */
export const transferWallpapersAccess = {
  create: (({ req: { user } }) => Boolean(user && checkRole(['admin'], user))) as Access,

  read: (({ req: { user } }) => {
    // Admins have unrestricted access to all wallpapers (drafts, inactive, archived, scheduled)
    if (user && checkRole(['admin'], user)) return true

    // Public / recipient access: strictly active status within current schedule window
    const now = new Date().toISOString()
    return {
      and: [
        { status: { equals: 'active' } },
        { startDate: { less_than_equal: now } },
        {
          or: [
            { endDate: { exists: false } },
            { endDate: { greater_than_equal: now } },
          ],
        },
      ],
    }
  }) as Access,

  update: (({ req: { user } }) => Boolean(user && checkRole(['admin'], user))) as Access,

  delete: (({ req: { user } }) => Boolean(user && checkRole(['admin'], user))) as Access,
}
