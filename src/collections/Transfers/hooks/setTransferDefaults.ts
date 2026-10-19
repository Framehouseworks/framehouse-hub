import type { CollectionBeforeChangeHook } from 'payload'
import crypto from 'crypto'
import { TRANSFER_EXPIRY_MS } from '../constants'

/**
 * Sets default values on transfer document creation:
 * - shareHash: unique collision-resistant 12-char hex token prefixed with 'tr_'
 * - expiresAt: exactly 72 hours from creation timestamp
 * - downloadCount: initialized to 0
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

  return data
}
