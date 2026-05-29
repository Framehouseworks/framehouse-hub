import type { CollectionBeforeChangeHook } from 'payload'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import {
  buildStoragePath,
  classifyDomainCategory,
  domainCategoryToMediaType,
} from '@/lib/storage-paths'

const MEDIA_ROOT = path.resolve(process.cwd(), 'public/media')

// In local mode (no GCS_BUCKET), Payload's local storage adapter is disabled
// on the Media collection, so it's our responsibility to persist the original
// bytes. We mirror the cloud contract from signed-url + register-gcs:
//
//   tenants/{userId}/{domain}/{year}/{month}/{assetUUID}/original/{filename}
//
// Generating the assetUUID here (rather than reusing Payload's numeric doc id)
// matches the path the Go worker already understands and removes the need to
// "know the doc id" before laying down the file.
export const writeOriginalToEnclave: CollectionBeforeChangeHook = async ({
  data,
  operation,
  req,
}) => {
  if (operation !== 'create') return data

  // Cloud-mode docs are created by /api/media/register-gcs with storagePath
  // already populated; nothing to do here.
  const isCloudMode = !!process.env.GCS_BUCKET
  if (isCloudMode) return data

  // If storagePath is already set (seed pre-populates it, or another caller
  // has staged the file), trust it.
  if (data?.storagePath) return data

  const incoming = req.file
  if (!incoming || !incoming.data) return data

  const filename = incoming.name
  const mimeType = incoming.mimetype || data?.mimeType || 'application/octet-stream'
  const ownerId =
    typeof data?.owner === 'object' && data?.owner && 'id' in data.owner
      ? String((data.owner as { id: number | string }).id)
      : data?.owner !== undefined
        ? String(data.owner)
        : req.user?.id !== undefined
          ? String(req.user.id)
          : null

  if (!filename || !ownerId) {
    req.payload.logger.warn(
      `[writeOriginalToEnclave] Missing filename/owner; skipping enclave write`,
    )
    return data
  }

  const now = new Date()
  const year = now.getFullYear().toString()
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  const assetId = crypto.randomUUID()
  const domainCategory = classifyDomainCategory(mimeType, filename)
  const storagePath = buildStoragePath({
    userId: ownerId,
    domainCategory,
    year,
    month,
    assetId,
    filename,
  })

  const enclavePath = path.join(MEDIA_ROOT, storagePath)
  const enclaveDir = path.dirname(enclavePath)

  if (!enclavePath.startsWith(MEDIA_ROOT + path.sep)) {
    throw new Error(`[writeOriginalToEnclave] Refusing to write outside MEDIA_ROOT: ${enclavePath}`)
  }

  fs.mkdirSync(enclaveDir, { recursive: true })
  const buffer = Buffer.isBuffer(incoming.data)
    ? incoming.data
    : Buffer.from(incoming.data as Uint8Array)
  fs.writeFileSync(enclavePath, new Uint8Array(buffer))

  return {
    ...data,
    // filename is Payload's upload-managed field — do not set it here.
    // Payload derives it from req.file.name after beforeOperation runs.
    originalFilename: filename,
    mimeType,
    filesize: incoming.size ?? buffer.length,
    mediaType: data?.mediaType ?? domainCategoryToMediaType(domainCategory),
    storagePath,
    originalUrl: `/media/${storagePath}`,
    ingestionStatus: data?.ingestionStatus ?? 'processing',
    processingStep: data?.processingStep ?? 'upload_complete',
  }
}
