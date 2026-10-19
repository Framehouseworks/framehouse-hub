import type { CollectionConfig } from 'payload'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { sql } from '@payloadcms/db-postgres'
import { checkRole } from '@/access/utilities'

import { getStorageClient } from '@/lib/gcs-client'
import { MAX_TRANSFER_BYTES } from './constants'

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

  // ── 2. Instant recipient download ─────────────────────────────────────────
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

  // ── 3. Local mode binary upload endpoint ──────────────────────────────────
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
]
