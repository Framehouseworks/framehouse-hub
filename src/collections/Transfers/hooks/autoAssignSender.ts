import type { FieldHook } from 'payload'

/**
 * Field hook to auto-assign authenticated user as transfer sender.
 */
export const autoAssignSender: FieldHook = ({ req, value }) => {
  if (req.user && !value) return req.user.id
  return value
}
