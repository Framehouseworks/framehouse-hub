import type { CollectionBeforeChangeHook } from 'payload'

export const ensureLibraryAssignment: CollectionBeforeChangeHook = async ({ data, req, operation: _operation }) => {
    // 1. If a folder is already assigned, we don't interfere (allows subfolder placement)
    if (data.folder) {
        return data
    }

    try {
        // 2. Search for the "Portfolio Library" folder at the root
        const folders = await req.payload.find({
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

        let libraryFolderId

        if (folders.docs.length > 0) {
            libraryFolderId = folders.docs[0].id
        } else {
            // 3. Create it if it doesn't exist
            const newFolder = await req.payload.create({
                collection: 'payload-folders',
                data: {
                    name: 'Portfolio Library',
                },
            })
            libraryFolderId = newFolder.id
        }

        // 4. Assign the portfolio to the library
        return {
            ...data,
            folder: libraryFolderId,
        }
    } catch (err) {
        req.payload.logger.error({ err, msg: 'Error in ensureLibraryAssignment hook' })
        return data
    }
}
