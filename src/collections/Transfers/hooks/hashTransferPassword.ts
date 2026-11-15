import type { CollectionBeforeChangeHook } from 'payload'
import crypto from 'crypto'
import { checkRole } from '@/access/utilities'
import { PASSWORD_MIN_LENGTH } from '../constants'

/**
 * Derives a 64-byte key using Node.js built-in scrypt (N=16384, r=8, p=1).
 * ~10ms execution time on 1-CPU Cloud Run, protecting compute bounds.
 */
function hashPasswordScrypt(password: string, salt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(
      password,
      salt,
      64,
      { N: 16384, r: 8, p: 1, maxmem: 32 * 1024 * 1024 },
      (err, derivedKey) => {
        if (err) return reject(err)
        resolve(derivedKey.toString('hex'))
      },
    )
  })
}

/**
 * Handles password hashing, clearing, version incrementing, and admin audit logging
 * before a transfer document is created or updated.
 */
export const hashTransferPassword: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
  operation,
}) => {
  if (!data) return data

  const rawPassword = data._password
  const wasEnabled = originalDoc?.passwordEnabled ?? false
  let isNowEnabled = data.passwordEnabled !== undefined ? Boolean(data.passwordEnabled) : wasEnabled

  let passwordStateChanged = false
  let actionType: 'transfer_password_set' | 'transfer_password_cleared' | null = null

  // Case 1: Plaintext password provided (setting or updating password)
  if (typeof rawPassword === 'string' && rawPassword.trim().length > 0) {
    const trimmed = rawPassword.trim()
    if (trimmed.length < PASSWORD_MIN_LENGTH) {
      throw new Error(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
    }

    const salt = crypto.randomBytes(16).toString('hex')
    const hash = await hashPasswordScrypt(trimmed, salt)

    data.passwordHash = hash
    data.passwordSalt = salt
    data.passwordEnabled = true
    data.passwordVersion = (originalDoc?.passwordVersion ?? 0) + 1
    isNowEnabled = true

    passwordStateChanged = true
    actionType = 'transfer_password_set'
  } else if (data.passwordEnabled === false && wasEnabled) {
    // Case 2: Explicitly toggled OFF from previously enabled
    data.passwordHash = null
    data.passwordSalt = null
    data.passwordEnabled = false
    data.passwordVersion = (originalDoc?.passwordVersion ?? 0) + 1
    isNowEnabled = false

    passwordStateChanged = true
    actionType = 'transfer_password_cleared'
  } else if (operation === 'create') {
    // Ensure default values on create if no password supplied
    if (data.passwordEnabled === undefined) {
      data.passwordEnabled = false
    }
    if (data.passwordVersion === undefined) {
      data.passwordVersion = 0
    }
  }

  // Always delete transient _password field from data so it never persists to DB
  delete data._password

  // Admin audit logging if acting user is admin and password state changed
  if (
    passwordStateChanged &&
    actionType &&
    req?.user &&
    checkRole(['admin'], req.user)
  ) {
    try {
      const adminName = req.user.name || req.user.email || 'Admin'
      const targetTransferId = originalDoc?.id || data.id
      const transferFilename = data.filename || originalDoc?.filename || 'transfer'
      const targetSenderId =
        typeof originalDoc?.sender === 'object'
          ? originalDoc?.sender?.id
          : originalDoc?.sender || (typeof data.sender === 'object' ? data.sender?.id : data.sender)

      const description =
        actionType === 'transfer_password_set'
          ? `Admin '${adminName}' set/updated password for transfer '${transferFilename}'`
          : `Admin '${adminName}' cleared password for transfer '${transferFilename}'`

      await req.payload.create({
        collection: 'admin-activity-logs',
        data: {
          adminUser: req.user.id,
          targetUser: targetSenderId || null,
          actionType,
          actionDescription: description,
          metadata: {
            transferId: targetTransferId || null,
            filename: transferFilename,
            passwordEnabled: isNowEnabled,
            passwordVersion: data.passwordVersion,
          },
          ipAddress: req.headers?.get?.('x-forwarded-for') ?? req.headers?.get?.('x-real-ip') ?? null,
          userAgent: req.headers?.get?.('user-agent') ?? null,
        },
        overrideAccess: true,
        req,
      })
    } catch {
      // Non-blocking for primary transfer operation
    }
  }

  return data
}

