import type { CollectionAfterDeleteHook } from 'payload'
import fs from 'fs'
import path from 'path'

const MEDIA_ROOT = path.resolve(process.cwd(), 'public/media')

/**
 * cleanupTransferFile — Purges physical file bytes upon transfer document deletion.
 * Viable in both local dev (filesystem enclave) and deployed environments (Google Cloud Storage).
 */
export const cleanupTransferFile: CollectionAfterDeleteHook = async ({ doc, req }) => {
  const storagePath = (doc as { storagePath?: string }).storagePath
  if (!storagePath) return

  // 1. Cloud Mode: Delete object from Google Cloud Storage
  const bucketName = process.env.GCS_BUCKET
  if (bucketName) {
    try {
      const { Storage } = await import('@google-cloud/storage')
      let storage: InstanceType<typeof Storage>

      if (process.env.GCP_SERVICE_ACCOUNT_KEY) {
        try {
          const credentials = JSON.parse(process.env.GCP_SERVICE_ACCOUNT_KEY)
          storage = new Storage({ credentials, projectId: process.env.GCS_PROJECT_ID })
        } catch {
          storage = new Storage({ projectId: process.env.GCS_PROJECT_ID })
        }
      } else {
        storage = new Storage({ projectId: process.env.GCS_PROJECT_ID })
      }

      await storage.bucket(bucketName).file(storagePath).delete({ ignoreNotFound: true })
      req.payload.logger.info(`[cleanupTransferFile] Purged GCS object: ${storagePath}`)
      return
    } catch (err) {
      req.payload.logger.error(
        `[cleanupTransferFile] Failed to purge GCS object ${storagePath}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      )
    }
  }

  // 2. Local Mode: Delete file from local media directory
  try {
    const localFilePath = path.resolve(MEDIA_ROOT, storagePath)
    if (localFilePath.startsWith(MEDIA_ROOT + path.sep)) {
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath)
      }

      // Recursively clean up empty parent directories: transfers/{userId}/{shareHash}
      const originalDir = path.dirname(localFilePath)
      const shareDir = path.dirname(originalDir)
      if (fs.existsSync(shareDir) && shareDir.startsWith(MEDIA_ROOT + path.sep)) {
        fs.rmSync(shareDir, { recursive: true, force: true })
      }
      req.payload.logger.info(`[cleanupTransferFile] Purged local enclave: ${storagePath}`)
    }
  } catch (err) {
    req.payload.logger.error(
      `[cleanupTransferFile] Failed to purge local file ${storagePath}: ${
        err instanceof Error ? err.message : String(err)
      }`,
    )
  }
}
