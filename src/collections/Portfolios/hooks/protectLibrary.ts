import type { CollectionBeforeChangeHook, CollectionBeforeDeleteHook } from 'payload'
import { APIError } from 'payload'

/**
 * Prevents deletion of the "Portfolio Library" root folder.
 */
export const protectLibraryFolder: CollectionBeforeDeleteHook = async ({ req, id }) => {
    try {
        const folder = await req.payload.findByID({
            collection: 'payload-folders',
            id,
            depth: 0,
        })

        // Protect any folder named "Portfolio Library" that is a root folder
        if (folder && folder.name === 'Portfolio Library' && !folder.folder) {
            throw new APIError('The "Portfolio Library" is a protected system folder and cannot be deleted.', 400)
        }
    } catch (err) {
        if (err instanceof APIError) throw err
        // If not found, ignore (it might already be deleted or handle by Payload)
    }
}

/**
 * Ensures any new folder created at the root is automatically parented to "Portfolio Library".
 * This effectively removes the "option" for any other root folders.
 */
export const ensureFolderParenting: CollectionBeforeChangeHook = async ({ data, req, operation }) => {
    // 1. If we are creating the Library itself, allow it to be root
    if (data.name === 'Portfolio Library' && !data.folder) {
        return data
    }

    // 2. If it's a new folder and lacks a parent, FORCE it into the Library
    if (operation === 'create' && !data.folder) {
        try {
            const library = await req.payload.find({
                collection: 'payload-folders',
                where: {
                    and: [
                        { name: { equals: 'Portfolio Library' } },
                        { folder: { exists: false } }
                    ]
                },
                depth: 0,
                limit: 1,
            })

            if (library.docs.length > 0) {
                return {
                    ...data,
                    folder: library.docs[0].id,
                }
            }
        } catch (err) {
            req.payload.logger.error({ err, msg: 'Error in ensureFolderParenting hook during hardening' })
        }
    }

    return data
}
