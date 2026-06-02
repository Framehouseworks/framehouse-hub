import type { Access } from 'payload'
import { checkRole } from '@/access/utilities'

// Permits only users with the 'creative' or 'admin' role.
// Viewers may read assets but cannot create, update, or delete them.
export const creativeOrAdmin: Access = ({ req: { user } }) => {
  if (!user) return false
  return checkRole(['creative', 'admin'], user)
}
