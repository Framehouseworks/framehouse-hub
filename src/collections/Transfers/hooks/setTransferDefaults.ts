import type { CollectionBeforeChangeHook } from 'payload'
import crypto from 'crypto'
import { TRANSFER_EXPIRY_MS } from '../constants'

/**
 * Sets default values on transfer document creation/update:
 * - shareHash: unique collision-resistant 12-char hex token prefixed with 'tr_'
 * - expiresAt: exactly 72 hours from creation timestamp
 * - downloadCount: initialized to 0
 * - Synchronizes root metadata from files array (backward compatibility with FRH-67/68/70)
 */
export const setTransferDefaults: CollectionBeforeChangeHook = ({ data, operation }) => {
  if (operation === 'create') {
    if (!data.shareHash) {
      data.shareHash = `tr_${crypto.randomBytes(6).toString('hex')}`
    }

    if (!data.expiresAt) {
      data.expiresAt = new Date(Date.now() + TRANSFER_EXPIRY_MS).toISOString()
    }

    if (data.downloadCount == null) {
      data.downloadCount = 0
    }
  }

  // Synchronize constituent files array with root backward-compatible fields
  if (Array.isArray(data.files) && data.files.length > 0) {
    const primaryFile = data.files[0]
    const totalBytes = data.files.reduce((acc: number, f: any) => acc + (Number(f?.filesize) || 0), 0)

    if (!data.filename) {
      data.filename = primaryFile.filename
    }

    if (!data.filesize || totalBytes > 0) {
      data.filesize = totalBytes
    }

    if (!data.mimeType && primaryFile.mimeType) {
      data.mimeType = primaryFile.mimeType
    }

    if (!data.storagePath && primaryFile.storagePath) {
      data.storagePath = primaryFile.storagePath
    }
  } else if (data.filename && data.filesize && data.storagePath) {
    // If created via legacy single-file call, populate the files array
    data.files = [
      {
        filename: data.filename,
        filesize: data.filesize,
        mimeType: data.mimeType || 'application/octet-stream',
        storagePath: data.storagePath,
      },
    ]
  }

  return data
}
