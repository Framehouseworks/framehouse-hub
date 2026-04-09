import type { CollectionBeforeDeleteHook, FieldAccess } from 'payload'
import { APIError } from 'payload'

/**
 * A generalized 'beforeDelete' hook that prevents deletion of records
 * with specific slugs or names.
 */
export const protectCoreRecord = (
  slugs: string[], 
  errorMessage = 'This is a protected system record and cannot be deleted.'
): CollectionBeforeDeleteHook => 
  async ({ req, id, collection }) => {
    try {
      const doc = await req.payload.findByID({
        collection: collection.slug,
        id,
        depth: 0,
      })

      if (doc) {
        const idValue = (doc as any).slug || (doc as any).name || (doc as any).id
        if (slugs.includes(String(idValue))) {
          throw new APIError(errorMessage, 403)
        }
      }
    } catch (err) {
      if (err instanceof APIError) throw err
    }
  }

/**
 * Access control to prevent modification of specific fields (like slug)
 * on core system records.
 */
export const lockCoreField: FieldAccess = ({ req, doc }) => {
  const CORE_SLUGS = ['pricing', 'features', 'about']
  
  if (doc && CORE_SLUGS.includes(doc.slug)) {
    return false // Deny update for everyone if it's a core slug
  }

  return true
}
