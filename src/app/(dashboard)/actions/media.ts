'use server'

import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import type { Media } from '@/payload-types'
import { revalidatePath } from 'next/cache'

export type ActionResult<T = unknown> = {
  success: boolean
  message: string
  data?: T
  errors?: unknown
}

/**
 * Helper to get the authenticated user in server actions
 */
async function getAuth() {
  const headers = await getHeaders()
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers })
  return { payload, user }
}

/**
 * Single asset metadata update
 */
export async function updateMediaAction(
  id: string | number,
  data: Partial<Media>,
): Promise<ActionResult<Media>> {
  try {
    const { payload, user } = await getAuth()
    if (!user) return { success: false, message: 'Unauthorized' }

    const updated = await payload.update({
      collection: 'media',
      id,
      data,
      user, // Pass user to respect access control
    })

    revalidatePath('/dashboard')
    return { success: true, message: 'Asset updated successfully', data: updated }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update asset'
    console.error('[updateMediaAction] Error:', error)
    return { success: false, message, errors: error }
  }
}

/**
 * Single asset deletion
 */
export async function deleteMediaAction(id: string | number): Promise<ActionResult> {
  try {
    const { payload, user } = await getAuth()
    if (!user) return { success: false, message: 'Unauthorized' }

    await payload.delete({
      collection: 'media',
      id,
      user,
    })

    revalidatePath('/dashboard')
    return { success: true, message: 'Asset deleted successfully' }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete asset'
    console.error('[deleteMediaAction] Error:', error)
    return { success: false, message, errors: error }
  }
}

/**
 * Bulk asset deletion
 */
export async function bulkDeleteMediaAction(ids: (string | number)[]): Promise<ActionResult> {
  if (!ids.length) return { success: false, message: 'No assets selected' }

  try {
    const { payload, user } = await getAuth()
    if (!user) return { success: false, message: 'Unauthorized' }

    // Payload Local API delete with 'where' handles bulk deletion efficiently
    // It also handles file system cleanup automatically per media item
    await payload.delete({
      collection: 'media',
      where: {
        id: { in: ids },
      },
      user,
    })

    revalidatePath('/dashboard')
    return { success: true, message: `Successfully deleted ${ids.length} assets` }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete assets'
    console.error('[bulkDeleteMediaAction] Error:', error)
    return { success: false, message, errors: error }
  }
}

/**
 * Batch update tags for multiple assets
 */
export async function bulkUpdateTagsAction(
  ids: (string | number)[],
  tags: string[],
  mode: 'append' | 'replace' = 'append',
): Promise<ActionResult> {
  if (!ids.length) return { success: false, message: 'No assets selected' }

  try {
    const { payload, user } = await getAuth()
    if (!user) return { success: false, message: 'Unauthorized' }

    const formattedTags = tags.map((tag) => ({ tag }))

    if (mode === 'replace') {
      // Direct bulk update via where clause
      await payload.update({
        collection: 'media',
        where: {
          id: { in: ids },
        },
        data: {
          manualTags: formattedTags,
        },
        user,
      })
    } else {
      // Append mode: Need to merge with existing tags for each asset
      // Fetch current tags
      const { docs: currentDocs } = await payload.find({
        collection: 'media',
        where: {
          id: { in: ids },
        },
        limit: ids.length,
        user,
      })

      // Perform updates sequentially or in parallel
      // Sequential is safer for large batches to avoid DB lock issues,
      // but Parallel is faster. We'll use Promise.all for reasonable batch sizes.
      await Promise.all(
        currentDocs.map((doc) => {
          const existingTags = doc.manualTags || []
          const existingTagStrings = new Set(
            existingTags
              .map((t) => t.tag?.toLowerCase())
              .filter((tag): tag is string => typeof tag === 'string'),
          )

          // Only add tags that don't already exist (case-insensitive check)
          const newTagsToAppend = formattedTags.filter(
            (t) => !existingTagStrings.has(t.tag.toLowerCase()),
          )

          if (newTagsToAppend.length === 0) return Promise.resolve()

          return payload.update({
            collection: 'media',
            id: doc.id,
            data: {
              manualTags: [...existingTags, ...newTagsToAppend],
            },
            user,
          })
        }),
      )
    }

    revalidatePath('/dashboard')
    return { success: true, message: `Successfully updated tags for ${ids.length} assets` }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update tags'
    console.error('[bulkUpdateTagsAction] Error:', error)
    return { success: false, message, errors: error }
  }
}

/**
 * Create a new Smart Collection (Saved View)
 */
export async function createSmartCollectionAction(data: {
  name: string
  filterQuery: Record<string, unknown>
  icon?: 'folder' | 'tag' | 'sparkles' | 'camera' | 'map'
  description?: string
}): Promise<ActionResult> {
  try {
    const { payload, user } = await getAuth()
    if (!user) return { success: false, message: 'Unauthorized' }

    await payload.create({
      collection: 'smart-collections',
      data: {
        ...data,
        owner: user.id,
      },
      user,
    })

    revalidatePath('/dashboard')
    return { success: true, message: 'Smart Collection created successfully' }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create Smart Collection'
    console.error('[createSmartCollectionAction] Error:', error)
    return { success: false, message, errors: error }
  }
}

/**
 * Explicitly revalidate the dashboard path
 */
export async function revalidateDashboardAction(): Promise<void> {
  revalidatePath('/dashboard')
}
