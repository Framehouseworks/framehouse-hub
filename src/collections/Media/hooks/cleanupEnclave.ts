import type { CollectionAfterDeleteHook } from 'payload'
import fs from 'fs'
import path from 'path'

const MEDIA_ROOT = path.resolve(process.cwd(), 'public/media')

// Removes the tenant enclave asset directory (original + derivatives) after
// Payload has deleted the doc and the flat-path file. Payload's local upload
// adapter only knows about /media/{filename}; the canonical enclave at
// tenants/{user}/.../{assetId}/ would otherwise be orphaned on disk.
export const cleanupEnclave: CollectionAfterDeleteHook = async ({ doc, req }) => {
  const storagePath = (doc as { storagePath?: string }).storagePath
  if (!storagePath) return

  try {
    const enclaveFile = path.join(MEDIA_ROOT, storagePath)
    const originalDir = path.dirname(enclaveFile)
    const assetDir = path.dirname(originalDir)
    const expectedSegment = path.basename(originalDir)

    if (expectedSegment !== 'original') {
      req.payload.logger.warn(
        `[cleanupEnclave] Unexpected storagePath shape, skipping: ${storagePath}`,
      )
      return
    }

    if (assetDir.startsWith(MEDIA_ROOT + path.sep) && fs.existsSync(assetDir)) {
      fs.rmSync(assetDir, { recursive: true, force: true })
      req.payload.logger.info(`[cleanupEnclave] Removed enclave dir ${assetDir}`)
    }
  } catch (err) {
    req.payload.logger.error(
      `[cleanupEnclave] Failed to remove enclave for ${storagePath}: ${
        err instanceof Error ? err.message : String(err)
      }`,
    )
  }
}
