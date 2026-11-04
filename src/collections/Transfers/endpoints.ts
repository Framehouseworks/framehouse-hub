import type { CollectionConfig } from 'payload'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { sql } from '@payloadcms/db-postgres'
import { checkRole } from '@/access/utilities'

import { getStorageClient } from '@/lib/gcs-client'
import { MAX_TRANSFER_BYTES, PASSWORD_TOKEN_TTL_MS } from './constants'
import { evaluatePreviewEligibility, type TransferPreviewResponse } from '@/components/Transfers/Preview/types'

// In-memory rate limiting map for password verification attempts (5 attempts / 5 mins per IP + shareHash)
const passwordAttemptMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(key: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()

  // Lazy eviction of expired entries across requests
  for (const [k, val] of passwordAttemptMap.entries()) {
    if (now > val.resetAt) {
      passwordAttemptMap.delete(k)
    }
  }

  const record = passwordAttemptMap.get(key)
  if (!record) {
    return { allowed: true }
  }

  if (record.count >= 5) {
    const retryAfter = Math.max(1, Math.ceil((record.resetAt - now) / 1000))
    return { allowed: false, retryAfter }
  }

  return { allowed: true }
}

function recordFailedAttempt(key: string) {
  const now = Date.now()
  const record = passwordAttemptMap.get(key)
  if (!record || now > record.resetAt) {
    passwordAttemptMap.set(key, { count: 1, resetAt: now + 5 * 60 * 1000 })
  } else {
    record.count += 1
  }
}

function clearRateLimit(key: string) {
  passwordAttemptMap.delete(key)
}

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

export function createTransferToken(
  shareHash: string,
  passwordVersion: number,
  expiresAt: number,
): string {
  const secret = process.env.PAYLOAD_SECRET || 'fallback-secret'
  const payload = `${shareHash}:${passwordVersion}:${expiresAt}`
  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  return `${expiresAt}.${hmac}`
}

export function verifyTransferToken(
  shareHash: string,
  token: string | null | undefined,
  passwordVersion: number,
): boolean {
  if (!token) return false

  const parts = token.split('.')
  if (parts.length !== 2) return false

  const [expiresAtStr, signature] = parts
  const expiresAt = parseInt(expiresAtStr, 10)
  if (isNaN(expiresAt) || Date.now() > expiresAt) {
    return false
  }

  const secret = process.env.PAYLOAD_SECRET || 'fallback-secret'
  const expectedPayload = `${shareHash}:${passwordVersion}:${expiresAt}`
  const expectedHmac = crypto.createHmac('sha256', secret).update(expectedPayload).digest('hex')

  const sigBuffer = new Uint8Array(Buffer.from(signature, 'hex'))
  const expectedBuffer = new Uint8Array(Buffer.from(expectedHmac, 'hex'))

  if (sigBuffer.length !== expectedBuffer.length) {
    return false
  }

  return crypto.timingSafeEqual(sigBuffer, expectedBuffer)
}

function extractBearerToken(req: any): string | null {
  const authHeader = req.headers?.get?.('authorization') || req.headers?.get?.('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.slice(7).trim()
}

function getClientIp(req: any): string {
  const xForwardedFor = req.headers?.get?.('x-forwarded-for')
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim()
  }
  return req.headers?.get?.('x-real-ip') || 'unknown'
}

function slugifyFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const name = filename.slice(0, filename.length - ext.length - 1)
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${slug || 'file'}.${ext}`
}

export const transferEndpoints: CollectionConfig['endpoints'] = [
  // ── 1. Mint signed upload URL ─────────────────────────────────────────────
  {
    path: '/signed-url',
    method: 'post',
    handler: async (req) => {
      if (!req.user || !checkRole(['creative', 'admin'], req.user)) {
        return Response.json({ error: 'Unauthorized — active creative account required' }, { status: 401 })
      }

      let body: { filename?: string; filesize?: number; mimeType?: string } = {}
      try {
        body = (await req.json?.()) || {}
      } catch {
        return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
      }

      const { filename, filesize, mimeType } = body
      if (!filename || filesize == null) {
        return Response.json({ error: 'Missing required filename or filesize' }, { status: 400 })
      }

      const numericSize = Number(filesize)
      if (numericSize <= 0) {
        return Response.json({ error: 'Filesize must be greater than 0' }, { status: 400 })
      }

      if (numericSize > MAX_TRANSFER_BYTES) {
        return Response.json(
          { error: 'File exceeds 250MB transfer limit' },
          { status: 413 },
        )
      }

      const effectiveMimeType = mimeType || 'application/octet-stream'
      const shareHash = `tr_${crypto.randomBytes(6).toString('hex')}`
      const slugified = slugifyFilename(filename)
      const storagePath = `transfers/${req.user.id}/${shareHash}/original/${slugified}`

      const bucketName = process.env.GCS_BUCKET
      if (!bucketName) {
        return Response.json({
          localMode: true,
          shareHash,
          storagePath,
          mimeType: effectiveMimeType,
        })
      }

      try {
        const storage = await getStorageClient()
        const bucket = storage.bucket(bucketName)
        const file = bucket.file(storagePath)

        const [signedUrl] = await file.getSignedUrl({
          version: 'v4',
          action: 'write',
          expires: Date.now() + 15 * 60 * 1000, // 15-minute validity
          contentType: effectiveMimeType,
        })

        return Response.json({
          localMode: false,
          signedUrl,
          shareHash,
          storagePath,
          mimeType: effectiveMimeType,
        })
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Storage signing failed'
        return Response.json({ error: message }, { status: 500 })
      }
    },
  },

  // ── 2. Verify password & issue short-lived auth token (FRH-70) ───────────
  {
    path: '/:shareHash/verify-password',
    method: 'post',
    handler: async (req) => {
      const { shareHash } = req.routeParams as { shareHash: string }
      if (!shareHash) {
        return Response.json({ error: 'Share hash required' }, { status: 400 })
      }

      const clientIp = getClientIp(req)
      const rateLimitKey = `${clientIp}:${shareHash}`
      const rateLimit = checkRateLimit(rateLimitKey)
      if (!rateLimit.allowed) {
        return new Response(JSON.stringify({ error: 'Too many failed attempts. Please try again later.' }), {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimit.retryAfter || 300),
          },
        })
      }

      let body: { password?: string } = {}
      try {
        body = (await req.json?.()) || {}
      } catch {
        return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
      }

      const { password } = body
      if (!password || typeof password !== 'string') {
        return Response.json({ error: 'Password is required' }, { status: 400 })
      }

      const { docs } = await req.payload.find({
        collection: 'transfers',
        where: {
          and: [
            { shareHash: { equals: shareHash } },
            { status: { equals: 'active' } },
            { expiresAt: { greater_than: new Date().toISOString() } },
          ],
        },
        limit: 1,
        overrideAccess: true,
      })

      const transfer = docs[0]
      if (!transfer) {
        return Response.json({ error: 'Transfer not found, revoked, or expired' }, { status: 404 })
      }

      if (!transfer.passwordEnabled) {
        return Response.json({ error: 'This transfer is not password protected' }, { status: 400 })
      }

      if (!transfer.passwordHash || !transfer.passwordSalt) {
        return Response.json({ error: 'Transfer password configuration corrupted' }, { status: 500 })
      }

      try {
        const computedHash = await hashPasswordScrypt(password.trim(), transfer.passwordSalt)
        const computedBuffer = new Uint8Array(Buffer.from(computedHash, 'hex'))
        const storedBuffer = new Uint8Array(Buffer.from(transfer.passwordHash, 'hex'))

        const isMatch =
          computedBuffer.length === storedBuffer.length &&
          crypto.timingSafeEqual(computedBuffer, storedBuffer)

        if (!isMatch) {
          recordFailedAttempt(rateLimitKey)
          return Response.json({ error: 'Incorrect password' }, { status: 401 })
        }

        // On successful authentication, reset client rate limit for this transfer
        clearRateLimit(rateLimitKey)

        const expiresAt = Date.now() + PASSWORD_TOKEN_TTL_MS
        const token = createTransferToken(transfer.shareHash, transfer.passwordVersion || 0, expiresAt)

        return Response.json({
          token,
          expiresAt: new Date(expiresAt).toISOString(),
        })
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Password verification error'
        return Response.json({ error: message }, { status: 500 })
      }
    },
  },

  // ── 3. Instant recipient download ─────────────────────────────────────────
  {
    path: '/:shareHash/download',
    method: 'get',
    handler: async (req) => {
      const { shareHash } = req.routeParams as { shareHash: string }
      if (!shareHash) {
        return new Response('Share hash required', { status: 400 })
      }

      const { docs } = await req.payload.find({
        collection: 'transfers',
        where: {
          and: [
            { shareHash: { equals: shareHash } },
            { status: { equals: 'active' } },
            { expiresAt: { greater_than: new Date().toISOString() } },
          ],
        },
        limit: 1,
        overrideAccess: true,
      })

      const transfer = docs[0]
      if (!transfer) {
        return new Response('Transfer not found, revoked, or expired', { status: 410 })
      }

      // Password enforcement: require short-lived HMAC token if password protection is enabled
      if (transfer.passwordEnabled) {
        const token = extractBearerToken(req)
        const isValid = verifyTransferToken(transfer.shareHash, token, transfer.passwordVersion || 0)
        if (!isValid) {
          return new Response('Unauthorized: password verification required', { status: 401 })
        }
      }

      // Fire-and-forget atomic download counter increment
      try {
        req.payload.db.drizzle
          .execute(sql`
            UPDATE transfers 
            SET download_count = download_count + 1, last_downloaded_at = NOW() 
            WHERE id = ${transfer.id}
          `)
          .catch(() => {})
      } catch {
        // Non-blocking
      }

      // RFC 5987 / RFC 6266 filename header
      const asciiFallback = transfer.filename.replace(/[^\x20-\x7E]/g, '_')
      const rfc5987Filename = encodeURIComponent(transfer.filename)
      const contentDisposition = `attachment; filename="${asciiFallback}"; filename*=UTF-8''${rfc5987Filename}`

      const bucketName = process.env.GCS_BUCKET
      if (bucketName) {
        try {
          const storage = await getStorageClient()
          const file = storage.bucket(bucketName).file(transfer.storagePath)
          const [signedGetUrl] = await file.getSignedUrl({
            version: 'v4',
            action: 'read',
            expires: Date.now() + 15 * 60 * 1000,
            responseDisposition: contentDisposition,
            responseType: transfer.mimeType,
          })

          return Response.redirect(signedGetUrl, 302)
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to generate download URL'
          return new Response(message, { status: 500 })
        }
      }

      // Local mode: Stream from filesystem enclave
      const localFilePath = path.resolve(process.cwd(), 'public/media', transfer.storagePath)
      if (!fs.existsSync(localFilePath)) {
        return new Response('File missing from local storage', { status: 404 })
      }

      const stream = fs.createReadStream(localFilePath)
      return new Response(stream as unknown as ReadableStream, {
        headers: {
          'Content-Type': transfer.mimeType,
          'Content-Disposition': contentDisposition,
          'Content-Length': String(transfer.filesize),
        },
      })
    },
  },

  // ── 4. Local mode binary upload endpoint ──────────────────────────────────
  {
    path: '/upload-local',
    method: 'post',
    handler: async (req) => {
      if (!req.user || !checkRole(['creative', 'admin'], req.user)) {
        return Response.json({ error: 'Unauthorized — active creative account required' }, { status: 401 })
      }

      const storagePathHeader = req.headers.get('x-storage-path')
      if (!storagePathHeader) {
        return Response.json({ error: 'Missing X-Storage-Path header' }, { status: 400 })
      }

      // Prevent directory traversal
      const normalized = path.normalize(storagePathHeader)
      if (!normalized.startsWith('transfers/') || normalized.includes('..')) {
        return Response.json({ error: 'Invalid storage path' }, { status: 400 })
      }

      // Enforce tenant boundary: user must match storage path unless admin
      const userPrefix = `transfers/${req.user.id}/`
      const isAdmin = Boolean((req.user as any)?.roles?.includes('admin'))
      if (!isAdmin && !normalized.startsWith(userPrefix)) {
        return Response.json({ error: 'Storage path does not match authenticated user' }, { status: 403 })
      }

      const destination = path.resolve(process.cwd(), 'public/media', normalized)
      const dir = path.dirname(destination)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      try {
        const arrayBuffer = await req.arrayBuffer?.()
        if (!arrayBuffer) {
          return Response.json({ error: 'Empty request body' }, { status: 400 })
        }

        fs.writeFileSync(destination, new Uint8Array(arrayBuffer))
        return Response.json({ success: true, storagePath: normalized })
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Local upload failed'
        return Response.json({ error: message }, { status: 500 })
      }
    },
  },

  // ── 5. Recipient inline media preview (FRH-82) ───────────────────────────
  {
    path: '/:shareHash/preview',
    method: 'get',
    handler: async (req) => {
      const { shareHash } = req.routeParams as { shareHash: string }
      if (!shareHash) {
        return Response.json({ error: 'Share hash required' }, { status: 400 })
      }

      const { docs } = await req.payload.find({
        collection: 'transfers',
        where: {
          and: [
            { shareHash: { equals: shareHash } },
            { status: { equals: 'active' } },
            { expiresAt: { greater_than: new Date().toISOString() } },
          ],
        },
        limit: 1,
        overrideAccess: true,
      })

      const transfer = docs[0]
      if (!transfer) {
        return Response.json(
          { error: 'Transfer not found, revoked, or expired' },
          { status: 410 },
        )
      }

      // Password enforcement: require short-lived HMAC token if password protection is enabled
      if (transfer.passwordEnabled) {
        const token = extractBearerToken(req)
        const isValid = verifyTransferToken(transfer.shareHash, token, transfer.passwordVersion || 0)
        if (!isValid) {
          return Response.json({ error: 'Unauthorized: password verification required' }, { status: 401 })
        }
      }

      // Check format and size eligibility against free-tier thresholds
      const eligibility = evaluatePreviewEligibility(
        transfer.filename,
        transfer.mimeType,
        transfer.filesize,
      )

      if (!eligibility.eligible) {
        const payload: TransferPreviewResponse = {
          eligible: false,
          mediaType: eligibility.mediaType,
          reason: eligibility.reason,
          message: eligibility.message,
          filename: transfer.filename,
          filesize: transfer.filesize,
          mimeType: transfer.mimeType,
        }
        return Response.json(payload, { status: 200 })
      }

      const bucketName = process.env.GCS_BUCKET
      if (bucketName) {
        try {
          const storage = await getStorageClient()
          const file = storage.bucket(bucketName).file(transfer.storagePath)
          const [signedPreviewUrl] = await file.getSignedUrl({
            version: 'v4',
            action: 'read',
            expires: Date.now() + 60 * 60 * 1000, // 1 hour validity (FRH-82)
            responseDisposition: 'inline',
            responseType: transfer.mimeType,
          })

          const payload: TransferPreviewResponse = {
            eligible: true,
            mediaType: eligibility.mediaType,
            previewUrl: signedPreviewUrl,
            mimeType: transfer.mimeType,
            filename: transfer.filename,
            filesize: transfer.filesize,
          }
          return Response.json(payload, { status: 200 })
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to generate preview URL'
          return Response.json({ error: message }, { status: 500 })
        }
      }

      // Local mode: Provide local preview streaming endpoint
      const payload: TransferPreviewResponse = {
        eligible: true,
        mediaType: eligibility.mediaType,
        previewUrl: `/api/transfers/${transfer.shareHash}/preview-stream`,
        mimeType: transfer.mimeType,
        filename: transfer.filename,
        filesize: transfer.filesize,
      }
      return Response.json(payload, { status: 200 })
    },
  },

  // ── 6. Local mode inline preview binary streaming (FRH-82) ───────────────
  {
    path: '/:shareHash/preview-stream',
    method: 'get',
    handler: async (req) => {
      const { shareHash } = req.routeParams as { shareHash: string }
      if (!shareHash) {
        return new Response('Share hash required', { status: 400 })
      }

      const { docs } = await req.payload.find({
        collection: 'transfers',
        where: {
          and: [
            { shareHash: { equals: shareHash } },
            { status: { equals: 'active' } },
            { expiresAt: { greater_than: new Date().toISOString() } },
          ],
        },
        limit: 1,
        overrideAccess: true,
      })

      const transfer = docs[0]
      if (!transfer) {
        return new Response('Transfer not found, revoked, or expired', { status: 410 })
      }

      // Password enforcement: require short-lived HMAC token if password protection is enabled
      if (transfer.passwordEnabled) {
        const token = extractBearerToken(req)
        const isValid = verifyTransferToken(transfer.shareHash, token, transfer.passwordVersion || 0)
        if (!isValid) {
          return new Response('Unauthorized: password verification required', { status: 401 })
        }
      }

      const eligibility = evaluatePreviewEligibility(
        transfer.filename,
        transfer.mimeType,
        transfer.filesize,
      )

      if (!eligibility.eligible) {
        return new Response('File is not eligible for inline preview', { status: 400 })
      }

      const localFilePath = path.resolve(process.cwd(), 'public/media', transfer.storagePath)
      if (!fs.existsSync(localFilePath)) {
        return new Response('File missing from local storage', { status: 404 })
      }

      const stat = fs.statSync(localFilePath)
      const totalSize = stat.size
      const rangeHeader = req.headers.get('range')

      if (rangeHeader) {
        // Parse HTTP Range header: e.g. "bytes=0-1024" or "bytes=1024-"
        const parts = rangeHeader.replace(/bytes=/, '').split('-')
        const start = parseInt(parts[0], 10) || 0
        const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1
        const chunkSize = end - start + 1

        const stream = fs.createReadStream(localFilePath, { start, end })
        return new Response(stream as unknown as ReadableStream, {
          status: 206,
          headers: {
            'Content-Type': transfer.mimeType,
            'Content-Disposition': 'inline',
            'Content-Range': `bytes ${start}-${end}/${totalSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': String(chunkSize),
          },
        })
      }

      const stream = fs.createReadStream(localFilePath)
      return new Response(stream as unknown as ReadableStream, {
        headers: {
          'Content-Type': transfer.mimeType,
          'Content-Disposition': 'inline',
          'Accept-Ranges': 'bytes',
          'Content-Length': String(totalSize),
        },
      })
    },
  },
]
