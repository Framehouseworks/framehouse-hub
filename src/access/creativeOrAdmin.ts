import type { Access } from 'payload'

export const creativeOrAdmin: Access = ({ req: { user } }) => {
  if (!user) return false

  // For creation, we allow any logged-in user to upload their own media
  // In a production DAM, we might restrict this further, but for our platform
  // every registered user is a potential creative creator.
  return true
}
