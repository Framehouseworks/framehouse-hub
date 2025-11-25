// src/access/creativeOnly.ts
import type { User } from '@/payload-types'
import type { Access } from 'payload'
import { checkRole } from './utilities'

export const creativeOnly: Access = ({ req: { user } }) => {
  if (!user) return false
  return checkRole(['creative'], user as User)
}
