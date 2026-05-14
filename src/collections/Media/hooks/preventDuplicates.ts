import type { CollectionBeforeValidateHook } from 'payload'

/**
 * Prevents duplicate media ingestion by checking filename and filesize.
 * This is a 'Forensic Integrity' check to maintain a clean Source of Truth.
 */
export const preventDuplicates: CollectionBeforeValidateHook = async ({ data, req, operation }) => {
  // Only run on creation
  if (operation !== 'create') return data

  // We need both filename and filesize to perform a robust check
  // Payload populates these from the 'file' object during multipart uploads
  const filename = req.file?.name
  const filesize = req.file?.size

  if (filename && filesize) {
    const existingMedia = await req.payload.find({
      collection: 'media',
      where: {
        and: [
          {
            filename: {
              equals: filename,
            },
          },
          {
            filesize: {
              equals: filesize,
            },
          },
        ],
      },
      limit: 1,
    })

    if (existingMedia.docs.length > 0) {
      // Throwing an error here will halt the ingestion and return a 400 to the client
      throw new Error(`Asset already exists in the archive: ${filename}`)
    }
  }

  return data
}
