import { checkRole } from '@/access/utilities'
import type { Access } from 'payload'

export const ownerOrAdmin: Access = ({ req: { user } }) => {
    if (!user) return false

    if (checkRole(['admin'], user)) {
        return true
    }

    return {
        owner: {
            equals: user.id,
        },
    }
}
