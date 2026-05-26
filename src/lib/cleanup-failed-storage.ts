/**
 * cleanupFailedStorage — removes all storage artifacts for a failed media asset.
 *
 * In cloud mode (GCS_BUCKET set): deletes the original GCS object and any
 * derivative WebPs. In local mode: removes the entire tenant enclave directory.
 *
 * The Payload DB record is intentionally NOT deleted — it remains with
 * ingestionStatus='failed' so users can see and remove it from the admin.
 */

import path from 'path'
import fs from 'fs'

const MEDIA_ROOT = path.resolve(process.cwd(), 'public/media')

/**
 * Derives the derivative paths from a canonical storagePath.
 * storagePath shape: tenants/{userId}/{domain}/{year}/{month}/{assetId}/original/{filename}
 */
function deriveAssetBase(storagePath: string): string | null {
  const parts = storagePath.split('/')
  // parts[6] must be "original"
  if (parts.length < 8 || parts[6] !== 'original') return null
  return parts.slice(0, 6).join('/') // tenants/{userId}/{domain}/{year}/{month}/{assetId}
}

async function deleteGCSObject(bucket: string, objectPath: string, logger: Console): Promise<void> {
  try {
    const { Storage } = await import('@google-cloud/storage')
    const credentials = process.env.GCP_SERVICE_ACCOUNT_KEY
      ? (() => {
          try {
            return JSON.parse(process.env.GCP_SERVICE_ACCOUNT_KEY)
          } catch {
            return undefined
          }
        })()
      : undefined

    const storage = new Storage({
      projectId: process.env.GCS_PROJECT_ID,
      ...(credentials ? { credentials } : {}),
    })

    await storage.bucket(bucket).file(objectPath).delete({ ignoreNotFound: true })
    logger.info(`[cleanupFailedStorage] Deleted GCS object: gs://${bucket}/${objectPath}`)
  } catch (err) {
    // Non-fatal — log but don't rethrow. DB already reflects failed state.
    logger.error(
      `[cleanupFailedStorage] Failed to delete GCS object gs://${bucket}/${objectPath}: ${
        err instanceof Error ? err.message : String(err)
      }`,
    )
  }
}

export async function cleanupFailedStorage(
  storagePath: string,
  logger: Console = console,
): Promise<void> {
  if (!storagePath) return

  const gcsBucket = process.env.GCS_BUCKET

  if (gcsBucket) {
    // Cloud mode: delete original + both derivative sizes
    await deleteGCSObject(gcsBucket, storagePath, logger)
    const base = deriveAssetBase(storagePath)
    if (base) {
      await deleteGCSObject(gcsBucket, `${base}/derivatives/small.webp`, logger)
      await deleteGCSObject(gcsBucket, `${base}/derivatives/medium.webp`, logger)
    }
  } else {
    // Local mode: remove the entire asset enclave directory
    try {
      const enclaveFile = path.join(MEDIA_ROOT, storagePath)
      const originalDir = path.dirname(enclaveFile)
      const assetDir = path.dirname(originalDir)
      const expectedSegment = path.basename(originalDir)

      if (expectedSegment !== 'original') {
        logger.warn(`[cleanupFailedStorage] Unexpected storagePath shape, skipping: ${storagePath}`)
        return
      }

      if (assetDir.startsWith(MEDIA_ROOT + path.sep) && fs.existsSync(assetDir)) {
        fs.rmSync(assetDir, { recursive: true, force: true })
        logger.info(`[cleanupFailedStorage] Removed local enclave dir: ${assetDir}`)
      }
    } catch (err) {
      logger.error(
        `[cleanupFailedStorage] Failed to remove local enclave for ${storagePath}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      )
    }
  }
}
