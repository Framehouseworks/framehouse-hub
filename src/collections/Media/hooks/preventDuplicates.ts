import type { CollectionBeforeOperationHook } from 'payload'

/**
 * The 'Temporal Gatekeeper': Intercepts ingestion BEFORE the storage middleware
 * processes the disk write. This ensures physical and logical identities
 * are 100% synchronized, resolving the broken image regression.
 */
export const preventDuplicates: CollectionBeforeOperationHook = async ({
  args,
  operation,
  req,
}) => {
  // Only run on creation
  if (operation !== 'create' || !args.data) return args

  const { data } = args

  // --- 1. Archival Shoot Identity Versioning ---
  const shootName = data.shootName as string
  if (shootName) {
    let isShootUnique = false
    let shootCounter = 1
    let candidateShoot = shootName

    while (!isShootUnique) {
      const existingShoot = await req.payload.find({
        collection: 'media',
        where: { shootName: { equals: candidateShoot } },
        limit: 1,
        overrideAccess: true,
      })

      if (existingShoot.docs.length === 0) {
        isShootUnique = true
      } else {
        shootCounter++
        candidateShoot = `${shootName} [Batch ${shootCounter}]`
      }
    }
    data.shootName = candidateShoot
  }

  // --- 2. Scalable Canonical Identity (Filenames) ---
  // In beforeOperation, req.file is the authoritative source for the disk write
  const file = req.file
  if (!file) return args

  const filename = file.name
  const extension = filename.split('.').pop()
  const baseName = filename.split('.').slice(0, -1).join('.')

  let isFileUnique = false
  let fileCounter = 1
  let candidateFile = filename

  while (!isFileUnique) {
    const existingFile = await req.payload.find({
      collection: 'media',
      where: { filename: { equals: candidateFile } },
      limit: 1,
      overrideAccess: true,
    })

    if (existingFile.docs.length === 0) {
      isFileUnique = true
    } else {
      fileCounter++
      candidateFile = `${baseName}_v${fileCounter}.${extension}`
    }
  }

  if (candidateFile !== filename) {
    req.payload.logger.info(`[Media] Temporal Gatekeeper Rename: ${filename} -> ${candidateFile}`)

    // CRITICAL: Modifying req.file.name BEFORE the storage adapter sees it
    // ensures the physical file on disk matches the database record.
    file.name = candidateFile

    // Also ensure the data object reflects the new name
    data.filename = candidateFile
  }

  return args
}
