// src/access/creativeOrAdmin.ts
import type { User } from '@/payload-types'
import type { Access } from 'payload'
import { checkRole } from './utilities'

export const creativeOrAdmin: Access = ({ req: { user } }) => {
  if (!user) return false
  // admin OR creative
  return checkRole(['admin', 'creative'], user as User)
}
