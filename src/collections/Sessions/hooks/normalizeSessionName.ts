import type { FieldHook } from 'payload'

export const normalizeSessionName: FieldHook = ({ value }) => {
  if (typeof value !== 'string') return value
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1))
}
