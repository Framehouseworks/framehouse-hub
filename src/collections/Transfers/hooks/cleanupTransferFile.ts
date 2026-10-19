import type { CollectionAfterDeleteHook } from 'payload'
import fs from 'fs'
import path from 'path'
import { getStorageClient } from '@/lib/gcs-client'

const MEDIA_ROOT = path.resolve(process.cwd(), 'public/media')

/**
 * Validates canonical transfer storage path:
 * Expected shape: transfers/{userId}/{shareHash}/original/{filename} (exactly 5 parts)
 */
function isValidTransferStoragePath(storagePath: string): boolean {
  const parts = storagePath.split('/')
  return parts.length === 5 && parts[0] === 'transfers' && parts[3] === 'original' && Boolean(parts[1] && parts[2] && parts[4])
}

/**
 * cleanupTransferFile — Purges physical file bytes and directory placeholders upon transfer document deletion.
 * Viable in both local dev (filesystem enclave) and deployed environments (Google Cloud Storage).
 */
export const cleanupTransferFile: CollectionAfterDeleteHook = async ({ doc, req }) => {
  const storagePath = (doc as { storagePath?: string }).storagePath
  if (!storagePath) return

  // 1. Cloud Mode: Delete object and folder placeholders from Google Cloud Storage
  const bucketName = process.env.GCS_BUCKET
  if (bucketName) {
    try {
      const storage = await getStorageClient()
      const bucket = storage.bucket(bucketName)

      // Always delete the primary file object
      await bucket.file(storagePath).delete({ ignoreNotFound: true })
      req.payload.logger.info(`[cleanupTransferFile] Purged GCS object: ${storagePath}`)

      // Guard path shape before attempting placeholder deletions to prevent malformed deletions
      if (isValidTransferStoragePath(storagePath)) {
        const parts = storagePath.split('/')
        const shareHashDir = `${parts[0]}/${parts[1]}/${parts[2]}`
        const originalDir = `${shareHashDir}/${parts[3]}`

        await Promise.allSettled([
          bucket.file(`${originalDir}/`).delete({ ignoreNotFound: true }),
          bucket.file(`${shareHashDir}/`).delete({ ignoreNotFound: true }),
        ])
        req.payload.logger.info(`[cleanupTransferFile] Purged GCS folder placeholders for: ${shareHashDir}`)
      } else {
        req.payload.logger.warn(
          `[cleanupTransferFile] Skipping placeholder purge due to irregular storagePath shape: ${storagePath}`,
        )
      }
      return
    } catch (err) {
      req.payload.logger.error(
        `[cleanupTransferFile] Failed to purge GCS storage for ${storagePath}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      )
      return
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

